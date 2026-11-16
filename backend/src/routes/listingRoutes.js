import express from 'express';
import {
  getListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  getMyListings,
  updateListingStatus,
  toggleFavorite,
  getFavorites,
} from '../controllers/listingController.js';
import { protect, optionalAuth } from '../middleware/auth.js';
import { createListingLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.get('/', optionalAuth, getListings);
router.get('/user/my-listings', protect, getMyListings);
router.get('/user/favorites', protect, getFavorites);
router.get('/:id', optionalAuth, getListingById);
router.post('/', protect, createListingLimiter, createListing);
router.post('/:id/favorite', protect, toggleFavorite);
router.put('/:id', protect, updateListing);
router.delete('/:id', protect, deleteListing);
router.patch('/:id/status', protect, updateListingStatus);

export default router;
