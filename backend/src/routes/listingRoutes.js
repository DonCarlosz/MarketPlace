import express from 'express';
import {
  getListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  getMyListings,
  updateListingStatus,
} from '../controllers/listingController.js';
import { protect, optionalAuth } from '../middleware/auth.js';
import { createListingLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.get('/', optionalAuth, getListings);
router.get('/user/my-listings', protect, getMyListings);
router.get('/:id', optionalAuth, getListingById);
router.post('/', protect, createListingLimiter, createListing);
router.put('/:id', protect, updateListing);
router.delete('/:id', protect, deleteListing);
router.patch('/:id/status', protect, updateListingStatus);

export default router;
