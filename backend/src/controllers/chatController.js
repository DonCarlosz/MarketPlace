import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Listing from '../models/Listing.js';
import User from '../models/User.js';
import { getSmartSafeMeetupSpots } from '../services/safePlacesService.js';

// @desc    Get all conversations for the authenticated user
// @route   GET /api/chat/conversations
export const getConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate('participants', 'name avatar location isVerified')
      .populate('listing', 'title price priceType mode images status location preferredMeetup seller acceptsOffers minimumOfferPrice')
      .populate('lastMessage')
      .populate('initiator', 'name avatar')
      .populate('receiver', 'name avatar')
      .sort({ lastMessageAt: -1 });

    res.json({
      success: true,
      conversations,
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

    const messages = await Message.find({ conversation: req.params.id })
      .populate('sender', 'name avatar')
      .sort({ createdAt: 1 });

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
    let { content, text, messageType = 'text', offer, meetup } = req.body;
    content = typeof content === 'string' ? content : typeof text === 'string' ? text : '';
    const conversationId = req.params.id;

    const validMessageTypes = ['text', 'offer', 'meetup_proposal'];
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
      readBy: [req.user._id],
    });

    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    const populatedMessage = await Message.findById(message._id).populate('sender', 'name avatar');

    const io = req.app.get('io');
    if (io) {
      io.to(`conv_${conversationId}`).emit('receive_message', populatedMessage);
      if (conversation.status === 'accepted') {
        io.to(`conv_${conversationId}`).emit('conversation_accepted', { conversationId });
      }
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

    const conversation = await Conversation.findById(message.conversation);
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

    let parsedCounter = 0;
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

    const actionText =
      action === 'accept'
        ? `Offer of ₦${Number(message.offer.amount).toLocaleString()} was accepted!`
        : action === 'counter'
        ? `Counter-offer of ₦${parsedCounter.toLocaleString()} proposed.`
        : `Offer of ₦${Number(message.offer.amount).toLocaleString()} was declined.`;

    const systemMsg = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      content: actionText,
      messageType: 'system',
      readBy: [req.user._id],
    });
    const populatedSystemMsg = await Message.findById(systemMsg._id).populate('sender', 'name avatar');

    conversation.lastMessage = systemMsg._id;
    conversation.lastMessageAt = new Date();
    if (conversation.status === 'pending') {
      conversation.status = 'accepted';
    }
    await conversation.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`conv_${conversation._id}`).emit('offer_updated', populatedMessage);
      io.to(`conv_${conversation._id}`).emit('receive_message', populatedSystemMsg);
    }

    res.json({
      success: true,
      message: populatedMessage,
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
