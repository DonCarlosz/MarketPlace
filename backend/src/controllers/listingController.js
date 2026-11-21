import Listing from '../models/Listing.js';
import User from '../models/User.js';
import Review from '../models/Review.js';
import { resolveCityCoordinates, calculateDistanceKm } from '../utils/geo.js';

// @desc    Get all listings with filtering, search, and radius/proximity support
// @route   GET /api/listings
export const getListings = async (req, res, next) => {
  try {
    const {
      mode,
      category,
      search,
      minPrice,
      maxPrice,
      condition,
      lat,
      lng,
      userCity,
      radiusKm = 'all',
      sort = 'newest',
      page = 1,
      limit = 20,
    } = req.query;

    const query = { status: 'active' };

    // Exclude listings posted by the logged-in user so they only see other people's items
    if (req.user && req.user._id) {
      query.seller = { $ne: req.user._id };
    }

    // Mode filter: 'second-hand', 'new', 'service'
    if (mode && ['second-hand', 'new', 'service'].includes(mode)) {
      query.mode = mode;
    }

    // Category filter
    if (category && category !== 'all' && category !== 'All') {
      query.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }

    // Condition filter (for items)
    if (condition && condition !== 'all') {
      query.condition = condition;
    }

    // Price range
    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Keyword search (searches title, description, category, city)
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
        { 'location.city': searchRegex },
        { 'location.neighborhood': searchRegex },
      ];
    }

    // Resolve user coordinates for proximity & distance calculation
    let userCoords = null;
    if (lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
      userCoords = [Number(lng), Number(lat)];
    } else if (userCity && userCity !== 'All Locations') {
      userCoords = resolveCityCoordinates(userCity);
    } else if (req.user?.location?.coordinates?.length === 2 && req.user.location.coordinates[0] !== 0) {
      userCoords = req.user.location.coordinates;
    }

    // Geospatial search: filter within radiusKm if not 'all'
    if (userCoords && radiusKm && radiusKm !== 'all' && !isNaN(Number(radiusKm))) {
      const radiusInRadians = Number(radiusKm) / 6378.1; // Earth radius in km
      query['location.coordinates'] = {
        $geoWithin: {
          $centerSphere: [userCoords, radiusInRadians],
        },
      };
    }

    // Sorting
    let sortOption = { createdAt: -1 };
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    else if (sort === 'price-low') sortOption = { price: 1 };
    else if (sort === 'price-high') sortOption = { price: -1 };
    else if (sort === 'popular') sortOption = { views: -1 };

    const skip = (Number(page) - 1) * Number(limit);

    const [listings, total] = await Promise.all([
      Listing.find(query)
        .populate('seller', 'name avatar location isVerified createdAt')
        .sort(sortOption)
        .skip(skip)
        .limit(Number(limit)),
      Listing.countDocuments(query),
    ]);

    // Attach calculated distance in km if userCoords are known
    const listingsWithDistance = listings.map((item) => {
      const itemObj = item.toObject();
      if (userCoords && item.location?.coordinates?.length === 2) {
        itemObj.distanceKm = calculateDistanceKm(
          userCoords[0],
          userCoords[1],
          item.location.coordinates[0],
          item.location.coordinates[1]
        );
      }
      return itemObj;
    });

    res.json({
      success: true,
      count: listingsWithDistance.length,
      total,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      listings: listingsWithDistance,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single listing by ID
// @route   GET /api/listings/:id
export const getListingById = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id).populate(
      'seller',
      'name email avatar location isVerified createdAt bio feedbackScore detailedRatings'
    );

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found',
      });
    }

    // Increment views asynchronously
    listing.views = (listing.views || 0) + 1;
    await listing.save();

    // Calculate real live metrics for seller
    const sellerId = listing.seller?._id || listing.seller;
    const [itemsSoldCount, totalReviews, allReviews, activeListingsCount] = await Promise.all([
      Listing.countDocuments({ seller: sellerId, status: { $in: ['sold', 'completed'] } }),
      Review.countDocuments({ seller: sellerId }),
      Review.find({ seller: sellerId }).select('stars ratingType itemAccuracy communication punctuality'),
      Listing.countDocuments({ seller: sellerId, status: 'active' }),
    ]);

    let positiveCount = 0;
    let sumStars = 0;
    allReviews.forEach((r) => {
      sumStars += r.stars || 5;
      if (r.ratingType === 'positive' || (r.stars || 5) >= 4) positiveCount++;
    });

    const averageRating = totalReviews > 0 ? Number((sumStars / totalReviews).toFixed(1)) : 5.0;
    const positivePercentage =
      totalReviews > 0 ? Math.round((positiveCount / totalReviews) * 100) : 100;

    res.json({
      success: true,
      listing,
      sellerStats: {
        itemsSoldCount,
        totalReviews,
        averageRating,
        positivePercentage,
        activeListingsCount,
        hasReviews: totalReviews > 0,
        responseBadge: 'Replies fast',
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new listing
// @route   POST /api/listings
export const createListing = async (req, res, next) => {
  try {
    const {
      mode,
      title,
      description,
      price,
      priceType,
      category,
      condition,
      serviceType,
      availabilityNotes,
      images,
      itemSpecifics,
      flawDescription,
      acceptsOffers,
      minimumOfferPrice,
      allowsDelivery,
      city,
      neighborhood,
      coordinates,
      preferredMeetup,
    } = req.body;

    if (!title || !description || price === undefined || !category || !city) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, price, category, and city are required',
      });
    }

    const resolvedCoords =
      coordinates && coordinates.length === 2 && (coordinates[0] !== 0 || coordinates[1] !== 0)
        ? coordinates
        : resolveCityCoordinates(city);

    const listing = await Listing.create({
      seller: req.user._id,
      mode: mode || 'second-hand',
      title,
      description,
      price: Number(price),
      priceType: priceType || 'fixed',
      category,
      condition: mode === 'services' || mode === 'service' ? 'not-applicable' : condition,
      serviceType: serviceType || '',
      availabilityNotes: availabilityNotes || '',
      images: Array.isArray(images) ? images : [],
      itemSpecifics: itemSpecifics && typeof itemSpecifics === 'object' ? itemSpecifics : {},
      flawDescription: flawDescription || '',
      acceptsOffers: acceptsOffers !== undefined ? Boolean(acceptsOffers) : true,
      minimumOfferPrice: minimumOfferPrice ? Number(minimumOfferPrice) : 0,
      allowsDelivery: allowsDelivery !== undefined ? Boolean(allowsDelivery) : false,
      location: {
        city,
        neighborhood: neighborhood || '',
        coordinates: resolvedCoords,
      },
      preferredMeetup: preferredMeetup || 'Public meetup place (malls, busy cafés, police station safe-zone)',
    });

    const populatedListing = await Listing.findById(listing._id).populate(
      'seller',
      'name avatar location isVerified createdAt'
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('listing_created', populatedListing);
    }

    res.status(201).json({
      success: true,
      message: 'Listing published successfully',
      listing: populatedListing,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update listing
// @route   PUT /api/listings/:id
export const updateListing = async (req, res, next) => {
  try {
    let listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found',
      });
    }

    // Check ownership
    if (listing.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this listing',
      });
    }

    listing = await Listing.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: 'Listing updated successfully',
      listing,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete listing
// @route   DELETE /api/listings/:id
export const deleteListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found',
      });
    }

    if (listing.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this listing',
      });
    }

    await listing.deleteOne();

    const io = req.app.get('io');
    if (io) {
      io.emit('listing_deleted', { id: req.params.id });
    }

    res.json({
      success: true,
      message: 'Listing removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's own listings
// @route   GET /api/listings/user/my-listings
export const getMyListings = async (req, res, next) => {
  try {
    const listings = await Listing.find({ seller: req.user._id }).sort({ createdAt: -1 });
    res.json({
      success: true,
      count: listings.length,
      listings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update listing status (mark sold, completed, active)
// @route   PATCH /api/listings/:id/status
export const updateListingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    if (listing.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    listing.status = status;
    await listing.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('listing_status_changed', { id: listing._id, status: listing.status });
    }

    res.json({
      success: true,
      message: `Listing marked as ${status}`,
      listing,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle favorite on a listing
// @route   POST /api/listings/:id/favorite
export const toggleFavorite = async (req, res, next) => {
  try {
    const listingId = req.params.id;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!Array.isArray(user.favorites)) {
      user.favorites = [];
    }

    const isFav = user.favorites.some((fav) => fav.toString() === listingId);
    let updatedFavoritesCount = 0;

    if (isFav) {
      user.favorites = user.favorites.filter((fav) => fav.toString() !== listingId);
      const updatedListing = await Listing.findByIdAndUpdate(
        listingId,
        { $inc: { favoritesCount: -1 } },
        { new: true }
      );
      if (updatedListing && updatedListing.favoritesCount < 0) {
        updatedListing.favoritesCount = 0;
        await updatedListing.save();
      }
      updatedFavoritesCount = updatedListing?.favoritesCount || 0;
    } else {
      user.favorites.push(listingId);
      const updatedListing = await Listing.findByIdAndUpdate(
        listingId,
        { $inc: { favoritesCount: 1 } },
        { new: true }
      );
      updatedFavoritesCount = updatedListing?.favoritesCount || 1;
    }

    await user.save();

    res.json({
      success: true,
      isFavorite: !isFav,
      favorites: user.favorites,
      favoritesCount: updatedFavoritesCount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user's favorite listings
// @route   GET /api/listings/user/favorites
export const getFavorites = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'favorites',
      match: { status: 'active' },
      populate: { path: 'seller', select: 'name avatar location isVerified createdAt' },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const validFavorites = (user.favorites || []).filter(Boolean);

    res.json({
      success: true,
      count: validFavorites.length,
      listings: validFavorites,
    });
  } catch (error) {
    next(error);
  }
};
