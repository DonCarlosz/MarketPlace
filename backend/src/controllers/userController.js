import User from '../models/User.js';
import Listing from '../models/Listing.js';
import Review from '../models/Review.js';

// @desc    Get public user profile and 12-month reputation scorecard
// @route   GET /api/users/:id/profile
export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -refreshTokens -failedLoginAttempts -lockUntil -blockedUsers')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isOwnRequest = req.user?._id?.toString() === user._id.toString();

    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const [allReviews, activeListingsCount, itemsSoldCount] = await Promise.all([
      Review.find({ seller: user._id }).sort({ createdAt: -1 }).lean(),
      Listing.countDocuments({ seller: user._id, status: 'active' }),
      Listing.countDocuments({ seller: user._id, status: { $in: ['sold', 'completed'] } }),
    ]);

    const matrix = {
      oneMonth: { positive: 0, neutral: 0, negative: 0 },
      sixMonths: { positive: 0, neutral: 0, negative: 0 },
      twelveMonths: { positive: 0, neutral: 0, negative: 0 },
    };

    let totalItemAccuracy = 0;
    let totalCommunication = 0;
    let totalPunctuality = 0;
    let totalStars = 0;
    let positiveCount = 0;
    let neutralCount = 0;
    let negativeCount = 0;

    allReviews.forEach((rev) => {
      const revDate = new Date(rev.createdAt);
      const type =
        rev.ratingType || (rev.stars >= 4 ? 'positive' : rev.stars === 3 ? 'neutral' : 'negative');

      if (type === 'positive') positiveCount++;
      else if (type === 'neutral') neutralCount++;
      else if (type === 'negative') negativeCount++;

      const acc = Number(rev.itemAccuracy) || 3;
      const comm = Number(rev.communication) || 3;
      const punct = Number(rev.punctuality) || 3;
      let s = Number(rev.stars);
      if (isNaN(s) || s < 1) s = type === 'negative' ? 1 : type === 'neutral' ? 3 : 5;

      totalItemAccuracy += acc;
      totalCommunication += comm;
      totalPunctuality += punct;
      totalStars += s;

      if (revDate >= oneMonthAgo) matrix.oneMonth[type]++;
      if (revDate >= sixMonthsAgo) matrix.sixMonths[type]++;
      if (revDate >= twelveMonthsAgo) matrix.twelveMonths[type]++;
    });

    const totalReviews = allReviews.length;
    const hasReviews = totalReviews > 0;

    // Unified honest metrics: never show fake 100% or 5.0 when totalReviews === 0
    const positivePercentage = hasReviews ? Math.round((positiveCount / totalReviews) * 100) : null;
    const averageRating = hasReviews ? Number((totalStars / totalReviews).toFixed(1)) : null;

    const detailedRatings = {
      itemAccuracy: hasReviews ? Number((totalItemAccuracy / totalReviews).toFixed(1)) : 0,
      communication: hasReviews ? Number((totalCommunication / totalReviews).toFixed(1)) : 0,
      punctuality: hasReviews ? Number((totalPunctuality / totalReviews).toFixed(1)) : 0,
    };

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        ...(isOwnRequest ? { email: user.email } : {}),
        avatar: user.avatar,
        coverImage: user.coverImage || '',
        bio: user.bio,
        location: user.location,
        isVerified: Boolean(user.isVerified),
        verifiedEmail: Boolean(user.verifiedEmail ?? user.isVerified),
        verifiedPhone: Boolean(user.verifiedPhone),
        createdAt: user.createdAt,
        activeListingsCount,
        itemsSoldCount,
      },
      reputation: {
        scorecardMatrix: matrix,
        hasReviews,
        averageRating,
        positivePercentage,
        totalReviews,
        positiveCount,
        neutralCount,
        negativeCount,
        detailedRatings,
        itemsSoldCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get public listings by a specific user/seller
// @route   GET /api/users/:id/listings
export const getUserListings = async (req, res, next) => {
  try {
    const listings = await Listing.find({
      seller: req.params.id,
      status: 'active',
    })
      .sort({ createdAt: -1 })
      .populate('seller', 'name avatar location isVerified')
      .lean();

    res.json({
      success: true,
      listings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get reviews for a user/seller
// @route   GET /api/users/:id/reviews
export const getUserReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ seller: req.params.id })
      .populate('buyer', 'name avatar location')
      .populate('listing', 'title price images')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({
      success: true,
      reviews,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit a verified review / feedback for a seller
// @route   POST /api/users/:id/reviews
export const submitReview = async (req, res, next) => {
  try {
    const sellerId = req.params.id;
    const buyerId = req.user._id;

    if (sellerId.toString() === buyerId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot submit a review for yourself.',
      });
    }

    const sellerExists = await User.exists({ _id: sellerId });
    if (!sellerExists) {
      return res.status(404).json({
        success: false,
        message: 'Seller account not found.',
      });
    }

    const {
      listingId,
      ratingType = 'positive',
      stars = 5,
      itemAccuracy = 5,
      communication = 5,
      punctuality = 5,
      comment,
    } = req.body;

    if (typeof comment !== 'string' || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Feedback comment is required.',
      });
    }

    // Prevent duplicate review flooding by the same buyer on the same seller/listing
    const duplicateFilter = listingId
      ? { seller: sellerId, buyer: buyerId, listing: listingId }
      : { seller: sellerId, buyer: buyerId, listing: null };

    const existingReview = await Review.findOne(duplicateFilter);

    const validRatingType = ['positive', 'neutral', 'negative'].includes(ratingType)
      ? ratingType
      : 'positive';

    let parsedStars = Number(stars);
    const parsedAccuracy = Math.max(1, Math.min(5, Number(itemAccuracy) || 3));
    const parsedComm = Math.max(1, Math.min(5, Number(communication) || 3));
    const parsedPunct = Math.max(1, Math.min(5, Number(punctuality) || 3));
    const calculatedAverage = Math.round((parsedAccuracy + parsedComm + parsedPunct) / 3);

    if (isNaN(parsedStars) || parsedStars < 1) {
      parsedStars = calculatedAverage;
    }

    if (validRatingType === 'negative') {
      parsedStars = Math.min(2, Math.min(parsedStars, calculatedAverage));
    } else if (validRatingType === 'neutral') {
      parsedStars = Math.min(3, Math.max(2, parsedStars));
    } else if (validRatingType === 'positive') {
      parsedStars = Math.max(4, parsedStars);
    }

    let review;
    if (existingReview) {
      existingReview.ratingType = validRatingType;
      existingReview.stars = parsedStars;
      existingReview.itemAccuracy = parsedAccuracy;
      existingReview.communication = parsedComm;
      existingReview.punctuality = parsedPunct;
      existingReview.comment = comment.trim().slice(0, 1000);
      review = await existingReview.save();
    } else {
      review = await Review.create({
        seller: sellerId,
        buyer: buyerId,
        listing: listingId || null,
        ratingType: validRatingType,
        stars: parsedStars,
        itemAccuracy: parsedAccuracy,
        communication: parsedComm,
        punctuality: parsedPunct,
        comment: comment.trim().slice(0, 1000),
      });
    }

    const populatedReview = await Review.findById(review._id)
      .populate('buyer', 'name avatar location')
      .populate('listing', 'title price images');

    // Synchronize cached feedback metrics on User model
    const allReviews = await Review.find({ seller: sellerId }).lean();
    let positive = 0;
    let neutral = 0;
    let negative = 0;
    let sumAccuracy = 0;
    let sumComm = 0;
    let sumPunct = 0;

    allReviews.forEach((r) => {
      if (r.ratingType === 'positive') positive++;
      else if (r.ratingType === 'neutral') neutral++;
      else if (r.ratingType === 'negative') negative++;
      sumAccuracy += r.itemAccuracy || 3;
      sumComm += r.communication || 3;
      sumPunct += r.punctuality || 3;
    });

    const total = allReviews.length;
    const positivePercentage = total > 0 ? Math.round((positive / total) * 100) : 0;

    await User.findByIdAndUpdate(sellerId, {
      'feedbackScore.positive': positive,
      'feedbackScore.neutral': neutral,
      'feedbackScore.negative': negative,
      'feedbackScore.totalReviews': total,
      'feedbackScore.positivePercentage': positivePercentage,
      'detailedRatings.itemAccuracy': total > 0 ? Number((sumAccuracy / total).toFixed(1)) : 0,
      'detailedRatings.communication': total > 0 ? Number((sumComm / total).toFixed(1)) : 0,
      'detailedRatings.punctuality': total > 0 ? Number((sumPunct / total).toFixed(1)) : 0,
    });

    res.status(existingReview ? 200 : 201).json({
      success: true,
      updated: Boolean(existingReview),
      review: populatedReview,
      message: existingReview
        ? 'Your previous feedback has been updated.'
        : 'Feedback submitted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
