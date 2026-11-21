import express from 'express';
import {
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
} from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect); // all chat routes require authentication

router.get('/conversations', getConversations);
router.post('/conversations', createOrGetConversation);
router.get('/conversations/:id/messages', getMessages);
router.post('/conversations/:id/messages', sendMessage);

// eBay-style In-Chat Offer Response
router.patch('/messages/:id/offer', respondToOffer);

// TikTok-style acceptance & decline
router.patch('/conversations/:id/accept', acceptConversation);
router.patch('/conversations/:id/decline', declineConversation);

// Discreet Block & Unblock
router.post('/block/:userId', blockUser);
router.post('/unblock/:userId', unblockUser);
router.get('/blocked-users', getBlockedUsers);

export default router;
