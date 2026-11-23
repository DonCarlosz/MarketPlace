import express from 'express';
import {
  getUnreadSummary,
  getConversations,
  createOrGetConversation,
  getMessages,
  sendMessage,
  acceptConversation,
  declineConversation,
  blockUser,
  unblockUser,
  getBlockedUsers,
  respondToOffer,
  suggestSafeMeetupSpots,
} from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(protect); // all chat routes require authentication

router.get('/unread-count', getUnreadSummary);
router.get('/conversations', getConversations);
router.post('/conversations', createOrGetConversation);
router.get('/conversations/:id/messages', getMessages);
router.post('/conversations/:id/messages', sendMessage);

// In-Chat Offer Response
router.patch('/messages/:id/offer', respondToOffer);

// Message request acceptance & decline
router.patch('/conversations/:id/accept', acceptConversation);
router.patch('/conversations/:id/decline', declineConversation);

// Discreet Block & Unblock
router.post('/block/:userId', blockUser);
router.post('/unblock/:userId', unblockUser);
router.get('/blocked-users', getBlockedUsers);

// Smart Geo-AI Safe Meetup Discovery
router.post('/suggest-safe-spots', aiLimiter, suggestSafeMeetupSpots);

export default router;
