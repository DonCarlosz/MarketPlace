import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Listing from '../models/Listing.js';
import User from '../models/User.js';

// @desc    Get all conversations for the authenticated user
// @route   GET /api/chat/conversations
export const getConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate('participants', 'name avatar location isVerified')
      .populate('listing', 'title price mode images status location preferredMeetup seller')
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

    // Don't allow messaging yourself
    if (listing.seller.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot initiate a conversation on your own listing',
      });
    }

    // Check if blocked by either party
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
      .populate('listing', 'title price mode images status location preferredMeetup seller')
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
        .populate('listing', 'title price mode images status location preferredMeetup seller')
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
      .populate('listing', 'title price mode images status location preferredMeetup seller')
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

// @desc    Send a message via HTTP endpoint (with TikTok-style 5-message limit and blocking check)
// @route   POST /api/chat/conversations/:id/messages
export const sendMessage = async (req, res, next) => {
  try {
    let { content, text, messageType = 'text', offer, meetup } = req.body;
    content = content || text;
    const conversationId = req.params.id;

    if (messageType === 'offer' && offer?.amount && (!content || !content.trim())) {
      content = `🤝 Price Offer: ₦${Number(offer.amount).toLocaleString()}${
        offer.note ? ` ("${offer.note.trim()}")` : ''
      }`;
    } else if (messageType === 'meetup_proposal' && meetup?.spotName && (!content || !content.trim())) {
      content = `📍 Suggested Public Meetup: ${meetup.spotName}${meetup.address ? ` (${meetup.address})` : ''}`;
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Message content cannot be empty' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Check blocking status
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

    // TikTok-style message request acceptance & 5-message limit
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
        // If receiver is replying, automatically mark conversation as accepted!
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
      content: content.trim(),
      messageType,
      offer: messageType === 'offer' ? offer : undefined,
      meetup: messageType === 'meetup_proposal' ? meetup : undefined,
      readBy: [req.user._id],
    });

    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    const populatedMessage = await Message.findById(message._id).populate('sender', 'name avatar');

    // Broadcast message via Socket.io to all users in room
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

// @desc    Accept a message request (TikTok-style)
// @route   PATCH /api/chat/conversations/:id/accept
export const acceptConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
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

// @desc    Decline a message request
// @route   PATCH /api/chat/conversations/:id/decline
export const declineConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
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
    const user = await User.findById(req.user._id).populate('blockedUsers', 'name avatar email');
    res.json({
      success: true,
      blockedUsers: user.blockedUsers || [],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Accept, decline or counter an in-chat price offer
// @route   PATCH /api/chat/messages/:id/offer
export const respondToOffer = async (req, res, next) => {
  try {
    const { action, counterAmount } = req.body; // 'accept' | 'decline' | 'counter'
    const messageId = req.params.id;

    if (!['accept', 'decline', 'counter'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    const message = await Message.findById(messageId);
    if (!message || message.messageType !== 'offer') {
      return res.status(404).json({ success: false, message: 'Offer message not found' });
    }

    const conversation = await Conversation.findById(message.conversation);
    const isParticipant = conversation?.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (action === 'accept') {
      message.offer.status = 'accepted';
    } else if (action === 'decline') {
      message.offer.status = 'declined';
    } else if (action === 'counter') {
      message.offer.status = 'countered';
      message.offer.counterAmount = Number(counterAmount) || 0;
    }
    await message.save();

    const populatedMessage = await Message.findById(message._id).populate('sender', 'name avatar');

    // Create a system message in chat
    const actionText =
      action === 'accept'
        ? `🎉 Offer of ₦${Number(message.offer.amount).toLocaleString()} was accepted!`
        : action === 'counter'
        ? `🔄 Counter-offer of ₦${Number(counterAmount).toLocaleString()} proposed.`
        : `❌ Offer of ₦${Number(message.offer.amount).toLocaleString()} was declined.`;

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
