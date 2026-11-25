import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Listing from '../models/Listing.js';
import User from '../models/User.js';
import Media from '../models/Media.js';
import { getSmartSafeMeetupSpots } from '../services/safePlacesService.js';
import { isSafeImageUrl } from '../utils/sanitize.js';

// Helper to emit real-time WhatsApp-style notification to the recipient's personal user room
const emitUserNotification = (io, recipientId, payload) => {
  if (!io || !recipientId) return;
  io.to(`user_${recipientId.toString()}`).emit('new_message_notification', payload);
};

// @desc    Get unread messages & pending message requests summary for current user
// @route   GET /api/chat/unread-count
export const getUnreadSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const conversations = await Conversation.find({
      participants: userId,
      deletedBy: { $ne: userId },
      status: { $ne: 'declined' },
    })
      .select('_id status receiver clearedAt')
      .lean();

    const convIds = conversations.map((c) => c._id);
    const pendingRequests = conversations.filter(
      (c) => c.status === 'pending' && c.receiver?.toString() === userId.toString()
    ).length;

    let unreadMessages = 0;
    if (convIds.length > 0) {
      unreadMessages = await Message.countDocuments({
        conversation: { $in: convIds },
        sender: { $ne: userId },
        readBy: { $ne: userId },
      });
    }

    res.json({
      success: true,
      unreadMessages,
      pendingRequests,
      totalUnread: unreadMessages > 0 ? unreadMessages : pendingRequests,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all conversations for the authenticated user (with per-thread unread counts)
// @route   GET /api/chat/conversations
export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const conversations = await Conversation.find({
      participants: userId,
      deletedBy: { $ne: userId },
    })
      .populate('participants', 'name avatar location isVerified')
      .populate('listing', 'title price priceType mode images status location preferredMeetup seller acceptsOffers minimumOfferPrice')
      .populate('lastMessage')
      .populate('initiator', 'name avatar')
      .populate('receiver', 'name avatar')
      .sort({ lastMessageAt: -1 })
      .lean();

    const convIds = conversations.map((c) => c._id);
    const unreadMap = new Map();
    if (convIds.length > 0) {
      const counts = await Message.aggregate([
        {
          $match: {
            conversation: { $in: convIds },
            sender: { $ne: userId },
            readBy: { $ne: userId },
          },
        },
        {
          $group: {
            _id: '$conversation',
            count: { $sum: 1 },
          },
        },
      ]);
      counts.forEach((row) => unreadMap.set(row._id.toString(), row.count));
    }

    const enriched = conversations.map((c) => ({
      ...c,
      unreadCount: unreadMap.get(c._id.toString()) || 0,
    }));

    res.json({
      success: true,
      conversations: enriched,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get or create conversation for a listing
// @route   POST /api/chat/conversations
export const createOrGetConversation = async (req, res, next) => {
  try {
    const { listingId } = req.body;

    if (!listingId) {
      return res.status(400).json({ success: false, message: 'listingId is required' });
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    if (listing.seller.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot initiate a conversation on your own listing',
      });
    }

    const [currentUser, sellerUser] = await Promise.all([
      User.findById(req.user._id),
      User.findById(listing.seller),
    ]);

    const isBlocked =
      currentUser?.blockedUsers?.some((id) => id.toString() === listing.seller.toString()) ||
      sellerUser?.blockedUsers?.some((id) => id.toString() === req.user._id.toString());

    if (isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Unable to message this user because one of you has blocked the other.',
        blocked: true,
      });
    }

    let conversation = await Conversation.findOne({
      listing: listingId,
      participants: { $all: [req.user._id, listing.seller] },
    })
      .populate('participants', 'name avatar location isVerified')
      .populate('listing', 'title price priceType mode images status location preferredMeetup seller acceptsOffers minimumOfferPrice')
      .populate('lastMessage')
      .populate('initiator', 'name avatar')
      .populate('receiver', 'name avatar');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, listing.seller],
        listing: listingId,
        initiator: req.user._id,
        receiver: listing.seller,
        status: 'pending',
        senderMessageCount: 0,
      });

      conversation = await Conversation.findById(conversation._id)
        .populate('participants', 'name avatar location isVerified')
        .populate('listing', 'title price priceType mode images status location preferredMeetup seller acceptsOffers minimumOfferPrice')
        .populate('lastMessage')
        .populate('initiator', 'name avatar')
        .populate('receiver', 'name avatar');
    } else if (
      Array.isArray(conversation.deletedBy) &&
      conversation.deletedBy.some((id) => id.toString() === req.user._id.toString())
    ) {
      // Restore conversation in this user's inbox if they reopen it from the listing page
      await Conversation.updateOne(
        { _id: conversation._id },
        { $pull: { deletedBy: req.user._id } }
      );
    }

    res.json({
      success: true,
      conversation,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get messages for a conversation
// @route   GET /api/chat/conversations/:id/messages
export const getMessages = async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('participants', 'name avatar location isVerified')
      .populate('listing', 'title price priceType mode images status location preferredMeetup seller acceptsOffers minimumOfferPrice')
      .populate('lastMessage')
      .populate('initiator', 'name avatar')
      .populate('receiver', 'name avatar');

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      (p) => (p._id || p).toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to conversation' });
    }

    const userIdStr = req.user._id.toString();
    const userClearedAt = conversation.clearedAt?.get
      ? conversation.clearedAt.get(userIdStr)
      : conversation.clearedAt?.[userIdStr];

    const messageFilter = { conversation: req.params.id };
    if (userClearedAt) {
      messageFilter.createdAt = { $gt: new Date(userClearedAt) };
    }

    const messages = await Message.find(messageFilter)
      .populate('sender', 'name avatar')
      .sort({ createdAt: 1 });

    // Mark unread incoming messages in this thread as read
    await Message.updateMany(
      {
        conversation: req.params.id,
        sender: { $ne: req.user._id },
        readBy: { $ne: req.user._id },
      },
      { $addToSet: { readBy: req.user._id } }
    );

    res.json({
      success: true,
      messages,
      conversation,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a message via HTTP endpoint (with 5-message anti-spam limit, offer enforcement, and blocking check)
// @route   POST /api/chat/conversations/:id/messages
export const sendMessage = async (req, res, next) => {
  try {
    let { content, text, messageType = 'text', offer, meetup, voice } = req.body;
    content = typeof content === 'string' ? content : typeof text === 'string' ? text : '';
    const conversationId = req.params.id;

    const validMessageTypes = ['text', 'offer', 'meetup_proposal', 'voice'];
    if (!validMessageTypes.includes(messageType)) {
      messageType = 'text';
    }

    const conversation = await Conversation.findById(conversationId).populate('listing');
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Enforce real offer rules (acceptsOffers & minimumOfferPrice)
    let cleanOffer = undefined;
    let cleanVoice = undefined;
    if (messageType === 'offer') {
      const amount = Number(offer?.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Offer amount must be a valid positive number' });
      }
      const listing = conversation.listing;
      if (listing) {
        if (listing.seller?.toString() === req.user._id.toString()) {
          return res.status(400).json({
            success: false,
            message: 'Sellers cannot submit buyer offers on their own listing. Use Counter on an incoming offer.',
          });
        }
        if (listing.acceptsOffers === false) {
          return res.status(400).json({
            success: false,
            message: 'This listing has a fixed price and does not accept price offers.',
          });
        }
        if (listing.minimumOfferPrice > 0 && amount < listing.minimumOfferPrice) {
          return res.status(400).json({
            success: false,
            message: `Auto-declined: your offer is below the seller's minimum acceptable price of ₦${Number(
              listing.minimumOfferPrice
            ).toLocaleString()}.`,
          });
        }
      }
      cleanOffer = {
        amount,
        note: typeof offer?.note === 'string' ? offer.note.trim().slice(0, 300) : '',
        status: 'pending',
        isCounter: false,
        previousAmount: 0,
      };
      if (!content.trim()) {
        content = `Price Offer: ₦${amount.toLocaleString()}${cleanOffer.note ? ` ("${cleanOffer.note}")` : ''}`;
      }
    } else if (messageType === 'meetup_proposal') {
      if (!meetup?.spotName || typeof meetup.spotName !== 'string') {
        return res.status(400).json({ success: false, message: 'Meetup spot name is required' });
      }
      if (!content.trim()) {
        content = `Suggested Public Meetup: ${meetup.spotName}${meetup.address ? ` (${meetup.address})` : ''}`;
      }
    } else if (messageType === 'voice') {
      if (!voice?.url || !isSafeImageUrl(voice.url)) {
        return res.status(400).json({ success: false, message: 'Valid voice note URL is required.' });
      }
      const rawDur = Number(voice.duration);
      const duration = Number.isFinite(rawDur) ? Math.max(1, Math.min(300, Math.round(rawDur))) : 1;
      cleanVoice = {
        url: voice.url.trim(),
        duration,
        mimeType: typeof voice.mimeType === 'string' ? voice.mimeType.slice(0, 60) : 'audio/webm',
      };
      content = `Voice message (${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')})`;
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Message content cannot be empty' });
    }

    const otherParticipantId = conversation.participants.find(
      (p) => p.toString() !== req.user._id.toString()
    );

    const [currentUser, otherUser] = await Promise.all([
      User.findById(req.user._id),
      User.findById(otherParticipantId),
    ]);

    const isBlocked =
      currentUser?.blockedUsers?.some((id) => id.toString() === otherParticipantId.toString()) ||
      otherUser?.blockedUsers?.some((id) => id.toString() === req.user._id.toString());

    if (isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'You cannot send messages to this user because of block settings.',
        blocked: true,
      });
    }

    // Message request acceptance & 5-message anti-spam limit
    const currentUserIdStr = req.user._id.toString();
    const isInitiator = conversation.initiator
      ? conversation.initiator.toString() === currentUserIdStr
      : false;

    if (conversation.status === 'pending') {
      if (isInitiator) {
        if ((conversation.senderMessageCount || 0) >= 5) {
          return res.status(403).json({
            success: false,
            message:
              'Message limit reached (5/5). Waiting for the recipient to accept your message request.',
            limitReached: true,
          });
        }
        conversation.senderMessageCount = (conversation.senderMessageCount || 0) + 1;
      } else {
        conversation.status = 'accepted';
      }
    } else if (conversation.status === 'declined') {
      return res.status(403).json({
        success: false,
        message: 'This message request has been declined.',
        declined: true,
      });
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      content: content.trim().slice(0, 2000),
      messageType,
      offer: cleanOffer,
      meetup: messageType === 'meetup_proposal' ? meetup : undefined,
      voice: cleanVoice,
      readBy: [req.user._id],
    });

    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    // Re-surface the conversation in both participants' inboxes whenever a fresh message arrives
    if (Array.isArray(conversation.deletedBy) && conversation.deletedBy.length > 0) {
      conversation.deletedBy = [];
    }
    await conversation.save();

    const populatedMessage = await Message.findById(message._id).populate('sender', 'name avatar');

    const io = req.app.get('io');
    if (io) {
      io.to(`conv_${conversationId}`).emit('receive_message', populatedMessage);
      if (conversation.status === 'accepted') {
        io.to(`conv_${conversationId}`).emit('conversation_accepted', { conversationId });
      }
      emitUserNotification(io, otherParticipantId, {
        conversationId: conversation._id.toString(),
        message: populatedMessage,
        senderId: req.user._id.toString(),
        senderName: currentUser?.name || 'oBuy Member',
        senderAvatar: currentUser?.avatar || '',
        listingTitle: conversation.listing?.title || 'oBuy Listing',
        preview: populatedMessage.content,
        messageType,
        isRequest: conversation.status === 'pending' && isInitiator,
        createdAt: populatedMessage.createdAt,
      });
    }

    res.status(201).json({
      success: true,
      message: populatedMessage,
      conversationStatus: conversation.status,
      senderMessageCount: conversation.senderMessageCount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Accept a message request (Recipient ONLY - prevents initiator bypass)
// @route   PATCH /api/chat/conversations/:id/accept
export const acceptConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const userIdStr = req.user._id.toString();
    const isParticipant = conversation.participants.some((p) => p.toString() === userIdStr);

    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Only the recipient (non-initiator) can accept a pending message request
    if (conversation.initiator && conversation.initiator.toString() === userIdStr) {
      return res.status(403).json({
        success: false,
        message: 'Only the recipient can accept a pending message request.',
      });
    }

    conversation.status = 'accepted';
    await conversation.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`conv_${conversation._id}`).emit('conversation_accepted', {
        conversationId: conversation._id,
      });
    }

    res.json({
      success: true,
      message: 'Message request accepted',
      conversation,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Decline a message request (Recipient ONLY)
// @route   PATCH /api/chat/conversations/:id/decline
export const declineConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const userIdStr = req.user._id.toString();
    const isParticipant = conversation.participants.some((p) => p.toString() === userIdStr);

    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (conversation.initiator && conversation.initiator.toString() === userIdStr) {
      return res.status(403).json({
        success: false,
        message: 'Only the recipient can decline a pending message request.',
      });
    }

    conversation.status = 'declined';
    await conversation.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`conv_${conversation._id}`).emit('conversation_declined', {
        conversationId: conversation._id,
      });
    }

    res.json({
      success: true,
      message: 'Message request declined',
      conversation,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    WhatsApp-style delete conversation from user's inbox (Primary or Requests)
// @route   DELETE /api/chat/conversations/:id
export const deleteConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const userId = req.user._id;
    const userIdStr = userId.toString();
    const isParticipant = conversation.participants.some((p) => p.toString() === userIdStr);

    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Mark unread messages as read for this user so unread badges update immediately
    await Message.updateMany(
      {
        conversation: conversation._id,
        sender: { $ne: userId },
        readBy: { $ne: userId },
      },
      { $addToSet: { readBy: userId } }
    );

    // Record per-user soft deletion + clearedAt timestamp
    const existingDeleted = new Set((conversation.deletedBy || []).map((id) => id.toString()));
    existingDeleted.add(userIdStr);
    conversation.deletedBy = Array.from(existingDeleted);
    if (!conversation.clearedAt) {
      conversation.clearedAt = new Map();
    }
    conversation.clearedAt.set(userIdStr, new Date());

    // If all participants have deleted the chat, physically purge messages, voice media, and conversation
    const allDeleted = conversation.participants.every((p) => existingDeleted.has(p.toString()));
    if (allDeleted) {
      const voiceMsgs = await Message.find({
        conversation: conversation._id,
        messageType: 'voice',
        'voice.url': { $exists: true },
      })
        .select('voice.url')
        .lean();

      const mediaFilenames = voiceMsgs
        .map((m) => String(m.voice?.url || '').split('/api/media/')[1]?.split('?')[0])
        .filter(Boolean);

      await Promise.all([
        Message.deleteMany({ conversation: conversation._id }),
        Conversation.deleteOne({ _id: conversation._id }),
        mediaFilenames.length > 0 ? Media.deleteMany({ filename: { $in: mediaFilenames } }) : Promise.resolve(),
      ]);
    } else {
      await conversation.save();
    }

    res.json({
      success: true,
      message: 'Conversation deleted from your inbox.',
      conversationId: req.params.id,
      purged: allDeleted,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Block a user
// @route   POST /api/chat/block/:userId
export const blockUser = async (req, res, next) => {
  try {
    const targetUserId = req.params.userId;

    if (targetUserId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot block yourself' });
    }

    const targetExists = await User.exists({ _id: targetUserId });
    if (!targetExists) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { blockedUsers: targetUserId },
    });

    res.json({
      success: true,
      message: 'User has been blocked.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Unblock a user
// @route   POST /api/chat/unblock/:userId
export const unblockUser = async (req, res, next) => {
  try {
    const targetUserId = req.params.userId;

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { blockedUsers: targetUserId },
    });

    res.json({
      success: true,
      message: 'User has been unblocked.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users blocked by the current user
// @route   GET /api/chat/blocked-users
export const getBlockedUsers = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('blockedUsers', 'name avatar');
    res.json({
      success: true,
      blockedUsers: user.blockedUsers || [],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Accept, decline or counter an in-chat price offer (Counterparty ONLY, pending ONLY)
// @route   PATCH /api/chat/messages/:id/offer
export const respondToOffer = async (req, res, next) => {
  try {
    const { action, counterAmount } = req.body;
    const messageId = req.params.id;

    if (!['accept', 'decline', 'counter'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    const message = await Message.findById(messageId);
    if (!message || message.messageType !== 'offer') {
      return res.status(404).json({ success: false, message: 'Offer message not found' });
    }

    const conversation = await Conversation.findById(message.conversation).populate('listing', 'title');
    const userIdStr = req.user._id.toString();
    const isParticipant = conversation?.participants.some((p) => p.toString() === userIdStr);
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Security check: offer sender cannot accept/decline/counter their own offer!
    if (message.sender.toString() === userIdStr) {
      return res.status(403).json({
        success: false,
        message: 'You cannot respond to your own price offer.',
      });
    }

    // Only pending offers can be acted upon
    if (message.offer?.status && message.offer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `This offer has already been ${message.offer.status}.`,
      });
    }

    const otherParticipantId = conversation.participants.find((p) => p.toString() !== userIdStr);
    const actingUser = await User.findById(req.user._id).select('name avatar').lean();

    let parsedCounter = 0;
    const previousAmount = Number(message.offer.amount) || 0;
    if (action === 'accept') {
      message.offer.status = 'accepted';
    } else if (action === 'decline') {
      message.offer.status = 'declined';
    } else if (action === 'counter') {
      parsedCounter = Number(counterAmount);
      if (!Number.isFinite(parsedCounter) || parsedCounter <= 0) {
        return res.status(400).json({ success: false, message: 'Valid counter-offer amount is required' });
      }
      message.offer.status = 'countered';
      message.offer.counterAmount = parsedCounter;
    }
    await message.save();

    const populatedMessage = await Message.findById(message._id).populate('sender', 'name avatar');

    let populatedCounterMsg = null;
    let populatedSystemMsg = null;

    if (action === 'counter') {
      // Send a BRAND NEW pending offer message FROM the counter-bidder at the bottom of the chat
      // so the counterparty can immediately Accept, Counter, or Decline without scrolling back up!
      const counterNote =
        typeof req.body.note === 'string' ? req.body.note.trim().slice(0, 300) : '';
      const counterMsg = await Message.create({
        conversation: conversation._id,
        sender: req.user._id,
        content: `Counter-Offer: ₦${parsedCounter.toLocaleString()}${counterNote ? ` ("${counterNote}")` : ''}`,
        messageType: 'offer',
        offer: {
          amount: parsedCounter,
          status: 'pending',
          isCounter: true,
          previousAmount,
          note: counterNote,
        },
        readBy: [req.user._id],
      });
      populatedCounterMsg = await Message.findById(counterMsg._id).populate('sender', 'name avatar');
      conversation.lastMessage = counterMsg._id;
    } else {
      const actionText =
        action === 'accept'
          ? `Offer of ₦${previousAmount.toLocaleString()} was accepted!`
          : `Offer of ₦${previousAmount.toLocaleString()} was declined.`;

      const systemMsg = await Message.create({
        conversation: conversation._id,
        sender: req.user._id,
        content: actionText,
        messageType: 'system',
        readBy: [req.user._id],
      });
      populatedSystemMsg = await Message.findById(systemMsg._id).populate('sender', 'name avatar');
      conversation.lastMessage = systemMsg._id;
    }

    conversation.lastMessageAt = new Date();
    if (conversation.status === 'pending') {
      conversation.status = 'accepted';
    }
    await conversation.save();

    const io = req.app.get('io');
    const latestMsg = populatedCounterMsg || populatedSystemMsg;
    if (io) {
      io.to(`conv_${conversation._id}`).emit('offer_updated', populatedMessage);
      if (latestMsg) {
        io.to(`conv_${conversation._id}`).emit('receive_message', latestMsg);
        emitUserNotification(io, otherParticipantId, {
          conversationId: conversation._id.toString(),
          message: latestMsg,
          senderId: userIdStr,
          senderName: actingUser?.name || 'oBuy Member',
          senderAvatar: actingUser?.avatar || '',
          listingTitle: conversation.listing?.title || 'oBuy Listing',
          preview: latestMsg.content,
          messageType: latestMsg.messageType,
          isRequest: false,
          createdAt: latestMsg.createdAt,
        });
      }
    }

    res.json({
      success: true,
      message: populatedMessage,
      counterMessage: populatedCounterMsg,
      systemMessage: populatedSystemMsg,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Suggest smart geo-AI safe public meetup spots based on location & item bulkiness
// @route   POST /api/chat/suggest-safe-spots
export const suggestSafeMeetupSpots = async (req, res, next) => {
  try {
    const { lat, lng, city, neighborhood, listingId } = req.body;
    const userCity =
      typeof city === 'string' && city.trim()
        ? city.trim().slice(0, 80)
        : req.user?.location?.city || 'Lagos';

    const spots = await getSmartSafeMeetupSpots({
      lat: lat && Number.isFinite(Number(lat)) ? Number(lat) : null,
      lng: lng && Number.isFinite(Number(lng)) ? Number(lng) : null,
      city: userCity,
      neighborhood:
        typeof neighborhood === 'string'
          ? neighborhood.trim().slice(0, 80)
          : req.user?.location?.neighborhood || '',
      listingId,
    });

    res.json({
      success: true,
      spots,
    });
  } catch (error) {
    next(error);
  }
};
