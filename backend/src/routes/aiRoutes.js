import express from 'express';
import {
  chatWithAssistantController,
  draftListingController,
} from '../controllers/aiController.js';
import { protect, optionalAuth } from '../middleware/auth.js';
import { aiLimiter, guestAiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Universal Platform Assistant & Conversational Search (optionalAuth runs FIRST so guests get strict 6/hr cap)
router.post('/chat', optionalAuth, guestAiLimiter, aiLimiter, chatWithAssistantController);

// Seller Listing Co-Pilot & Price Valuer (authenticated only)
router.post('/draft-listing', protect, aiLimiter, draftListingController);

export default router;
