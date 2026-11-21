import express from 'express';
import {
  chatWithAssistantController,
  draftListingController,
} from '../controllers/aiController.js';
import { protect, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Universal Platform Assistant & Conversational Search
router.post('/chat', optionalAuth, chatWithAssistantController);

// Seller Listing Co-Pilot & Price Valuer
router.post('/draft-listing', protect, draftListingController);

export default router;
