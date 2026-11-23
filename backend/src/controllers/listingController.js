import Listing from '../models/Listing.js';
import User from '../models/User.js';
import Review from '../models/Review.js';
import Conversation from '../models/Conversation.js';
import { resolveCityCoordinates, calculateDistanceKm } from '../utils/geo.js';
import { escapeRegex, isSafeImageUrl } from '../utils/sanitize.js';

// Sanitize images array for create/update listing
const sanitizeImagesList = (images) => {
  if (!Array.isArray(images)) return [];
  return images
    .slice(0, 12)
    .filter((img) => img && typeof img.url === 'string' && isSafeImageUrl(img.url) && img.url.trim() !== '')
    .map((img) => ({
      url: img.url.trim(),
      caption: typeof img.caption === 'string' ? img.caption.trim().slice(0, 140) : '',
    }));
};

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

    // Category filter (ReDoS safe)
    if (typeof category === 'string' && category.trim() && category.toLowerCase() !== 'all') {
      const safeCat = escapeRegex(category.trim().slice(0, 80));
      query.category = { $regex: new RegExp(`^${safeCat}$`, 'i') };
    }

    // Condition filter (for items)
    if (
      typeof condition === 'string' &&
      ['brand-new', 'like-new', 'good', 'fair', 'for-parts'].includes(condition)
    ) {
      query.condition = condition;
    }

    // Price range
    const parsedMin = minPrice !== undefined && minPrice !== '' ? Number(minPrice) : null;
    const parsedMax = maxPrice !== undefined && maxPrice !== '' ? Number(maxPrice) : null;
    if ((parsedMin !== null && !isNaN(parsedMin)) || (parsedMax !== null && !isNaN(parsedMax))) {
      query.price = {};
      if (parsedMin !== null && !isNaN(parsedMin) && parsedMin >= 0) query.price.$gte = parsedMin;
      if (parsedMax !== null && !isNaN(parsedMax) && parsedMax >= 0) query.price.$lte = parsedMax;
    }

    // Keyword search (ReDoS safe)
    if (typeof search === 'string' && search.trim()) {
      const safeSearch = escapeRegex(search.trim().slice(0, 100));
      const searchRegex = new RegExp(safeSearch, 'i');
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
    } else if (typeof userCity === 'string' && userCity && userCity !== 'All Locations') {
      userCoords = resolveCityCoordinates(userCity);
    } else if (req.user?.location?.coordinates?.length === 2 && req.user.location.coordinates[0] !== 0) {
      userCoords = req.user.location.coordinates;
    }

    // Geospatial search: filter within radiusKm if not 'all'
    if (userCoords && radiusKm && radiusKm !== 'all' && !isNaN(Number(radiusKm))) {
      const clampedRadius = Math.max(1, Math.min(2000, Number(radiusKm)));
      const radiusInRadians = clampedRadius / 6378.1;
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

    // Clamp pagination bounds to prevent unbounded DB dump DoS
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.max(1, Math.min(50, parseInt(limit, 10) || 20));
    const skip = (safePage - 1) * safeLimit;

    const [listings, total] = await Promise.all([
      Listing.find(query)
        .populate('seller', 'name avatar location isVerified createdAt')
        .sort(sortOption)
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      Listing.countDocuments(query),
    ]);

    // Attach calculated distance in km if userCoords are known
    const listingsWithDistance = listings.map((item) => {
      if (userCoords && item.location?.coordinates?.length === 2) {
        return {
          ...item,
          distanceKm: calculateDistanceKm(
            userCoords[0],
            userCoords[1],
            item.location.coordinates[0],
            item.location.coordinates[1]
          ),
        };
      }
      return item;
    });

    res.json({
      success: true,
      count: listingsWithDistance.length,
      total,
      totalPages: Math.ceil(total / safeLimit),
      currentPage: safePage,
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
    // Public seller fields ONLY (never leak private seller email!)
    const listing = await Listing.findById(req.params.id).populate(
      'seller',
      'name avatar location isVerified createdAt bio feedbackScore detailedRatings'
    );

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found',
      });
    }

    // Increment views only if viewer is not the seller
    const viewerId = req.user?._id?.toString();
    const sellerId = (listing.seller?._id || listing.seller)?.toString();
    if (!viewerId || viewerId !== sellerId) {
      listing.views = (listing.views || 0) + 1;
      await Listing.updateOne({ _id: listing._id }, { $inc: { views: 1 } });
    }

    // Calculate real live metrics for seller from MongoDB (zero dummy metrics)
    const [itemsSoldCount, allReviews, activeListingsCount, totalReceivedChats, acceptedChats] =
      await Promise.all([
        Listing.countDocuments({ seller: sellerId, status: { $in: ['sold', 'completed'] } }),
        Review.find({ seller: sellerId })
          .select('stars ratingType itemAccuracy communication punctuality')
          .lean(),
        Listing.countDocuments({ seller: sellerId, status: 'active' }),
        Conversation.countDocuments({ receiver: sellerId }),
        Conversation.countDocuments({ receiver: sellerId, status: 'accepted' }),
      ]);

    const totalReviews = allReviews.length;
    let positiveCount = 0;
    let sumStars = 0;

    allReviews.forEach((r) => {
      let s = Number(r.stars);
      if (isNaN(s) || s < 1) {
        s = r.ratingType === 'negative' ? 1 : r.ratingType === 'neutral' ? 3 : 5;
      }
      if (r.ratingType === 'negative' && s > 2) {
        s = Math.min(2, Math.round(((r.itemAccuracy || 2) + (r.communication || 2) + (r.punctuality || 2)) / 3));
      }
      sumStars += s;
      if (r.ratingType === 'positive') {
        positiveCount++;
      }
    });

    const hasReviews = totalReviews > 0;
    const averageRating = hasReviews ? Number((sumStars / totalReviews).toFixed(1)) : null;
    const positivePercentage = hasReviews ? Math.round((positiveCount / totalReviews) * 100) : null;

    // Real backend-computed response badge from actual seller chat responsiveness
    let responseBadge = 'New Seller';
    let responseRate = null;
    if (totalReceivedChats > 0) {
      responseRate = Math.round((acceptedChats / totalReceivedChats) * 100);
      if (responseRate >= 80) responseBadge = `${responseRate}% Reply Rate`;
      else if (responseRate >= 50) responseBadge = `${responseRate}% Reply Rate`;
      else responseBadge = 'Responds Soon';
    } else if (activeListingsCount >= 3) {
      responseBadge = `${activeListingsCount} Active`;
    }

    res.json({
      success: true,
      listing,
      sellerStats: {
        itemsSoldCount,
        totalReviews,
        averageRating,
        positivePercentage,
        activeListingsCount,
        hasReviews,
        responseBadge,
        responseRate,
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

    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid non-negative price',
      });
    }

    const resolvedCoords =
      Array.isArray(coordinates) &&
      coordinates.length === 2 &&
      coordinates.every((c) => typeof c === 'number' && Number.isFinite(c)) &&
      (coordinates[0] !== 0 || coordinates[1] !== 0)
        ? coordinates
        : resolveCityCoordinates(city);

    const normalizedMode = ['second-hand', 'new', 'service'].includes(mode) ? mode : 'second-hand';

    // Clean itemSpecifics string map
    const cleanSpecifics = {};
    if (itemSpecifics && typeof itemSpecifics === 'object' && !Array.isArray(itemSpecifics)) {
      Object.entries(itemSpecifics)
        .slice(0, 20)
        .forEach(([k, v]) => {
          if (typeof k === 'string' && typeof v === 'string' && k.trim() && v.trim()) {
            cleanSpecifics[k.trim().slice(0, 50)] = v.trim().slice(0, 120);
          }
        });
    }

    const listing = await Listing.create({
      seller: req.user._id,
      mode: normalizedMode,
      title: String(title).trim().slice(0, 100),
      description: String(description).trim().slice(0, 2000),
      price: numericPrice,
      priceType: ['fixed', 'negotiable', 'starting-at', 'hourly', 'free'].includes(priceType)
        ? priceType
        : 'fixed',
      category: String(category).trim().slice(0, 80),
      condition: normalizedMode === 'service' ? 'not-applicable' : condition,
      serviceType: typeof serviceType === 'string' ? serviceType.trim().slice(0, 80) : '',
      availabilityNotes:
        typeof availabilityNotes === 'string' ? availabilityNotes.trim().slice(0, 300) : '',
      images: sanitizeImagesList(images),
      itemSpecifics: cleanSpecifics,
      flawDescription: typeof flawDescription === 'string' ? flawDescription.trim().slice(0, 500) : '',
      acceptsOffers: acceptsOffers !== undefined ? Boolean(acceptsOffers) : true,
      minimumOfferPrice:
        minimumOfferPrice && Number(minimumOfferPrice) > 0 ? Number(minimumOfferPrice) : 0,
      allowsDelivery: allowsDelivery !== undefined ? Boolean(allowsDelivery) : false,
      location: {
        type: 'Point',
        city: String(city).trim().slice(0, 80),
        neighborhood: typeof neighborhood === 'string' ? neighborhood.trim().slice(0, 80) : '',
        coordinates: resolvedCoords,
      },
      preferredMeetup:
        typeof preferredMeetup === 'string' && preferredMeetup.trim()
          ? preferredMeetup.trim().slice(0, 300)
          : 'Open public meetup place (shopping plaza, supermarket parking, bank security zone)',
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

// @desc    Update listing (Explicit field allowlist - prevents mass assignment)
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

    if (listing.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this listing',
      });
    }

    const {
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
      preferredMeetup,
    } = req.body;

    const allowedUpdates = {};
    if (typeof title === 'string' && title.trim()) allowedUpdates.title = title.trim().slice(0, 100);
    if (typeof description === 'string' && description.trim()) {
      allowedUpdates.description = description.trim().slice(0, 2000);
    }
    if (price !== undefined && Number.isFinite(Number(price)) && Number(price) >= 0) {
      allowedUpdates.price = Number(price);
    }
    if (['fixed', 'negotiable', 'starting-at', 'hourly', 'free'].includes(priceType)) {
      allowedUpdates.priceType = priceType;
    }
    if (typeof category === 'string' && category.trim()) {
      allowedUpdates.category = category.trim().slice(0, 80);
    }
    if (['brand-new', 'like-new', 'good', 'fair', 'for-parts', 'not-applicable'].includes(condition)) {
      allowedUpdates.condition = condition;
    }
    if (typeof serviceType === 'string') allowedUpdates.serviceType = serviceType.trim().slice(0, 80);
    if (typeof availabilityNotes === 'string') {
      allowedUpdates.availabilityNotes = availabilityNotes.trim().slice(0, 300);
    }
    if (Array.isArray(images)) allowedUpdates.images = sanitizeImagesList(images);
    if (itemSpecifics && typeof itemSpecifics === 'object' && !Array.isArray(itemSpecifics)) {
      const cleanSpecifics = {};
      Object.entries(itemSpecifics)
        .slice(0, 20)
        .forEach(([k, v]) => {
          if (typeof k === 'string' && typeof v === 'string' && k.trim() && v.trim()) {
            cleanSpecifics[k.trim().slice(0, 50)] = v.trim().slice(0, 120);
          }
        });
      allowedUpdates.itemSpecifics = cleanSpecifics;
    }
    if (typeof flawDescription === 'string') {
      allowedUpdates.flawDescription = flawDescription.trim().slice(0, 500);
    }
    if (acceptsOffers !== undefined) allowedUpdates.acceptsOffers = Boolean(acceptsOffers);
    if (minimumOfferPrice !== undefined && Number.isFinite(Number(minimumOfferPrice)) && Number(minimumOfferPrice) >= 0) {
      allowedUpdates.minimumOfferPrice = Number(minimumOfferPrice);
    }
    if (allowsDelivery !== undefined) allowedUpdates.allowsDelivery = Boolean(allowsDelivery);
    if (typeof preferredMeetup === 'string') {
      allowedUpdates.preferredMeetup = preferredMeetup.trim().slice(0, 300);
    }
    if (typeof city === 'string' && city.trim()) {
      allowedUpdates.location = {
        type: 'Point',
        city: city.trim().slice(0, 80),
        neighborhood:
          typeof neighborhood === 'string'
            ? neighborhood.trim().slice(0, 80)
            : listing.location?.neighborhood || '',
        coordinates: resolveCityCoordinates(city),
      };
    }

    listing = await Listing.findByIdAndUpdate(
      req.params.id,
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    );

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
    const listings = await Listing.find({ seller: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json({
      success: true,
      count: listings.length,
      listings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update listing status (mark sold, completed, active, inactive)
// @route   PATCH /api/listings/:id/status
export const updateListingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'sold', 'completed', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Allowed values: active, sold, completed, inactive.',
      });
    }

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
    const [user, listingExists] = await Promise.all([
      User.findById(req.user._id),
      Listing.findById(listingId).select('_id'),
    ]);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (!listingExists) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
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
