import express from 'express';
import {
  getUserProfile,
  getUserListings,
  getUserReviews,
  submitReview,
} from '../controllers/userController.js';
import { protect, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/:id/profile', optionalAuth, getUserProfile);
router.get('/:id/listings', optionalAuth, getUserListings);
router.get('/:id/reviews', optionalAuth, getUserReviews);
router.post('/:id/reviews', protect, submitReview);

export default router;
