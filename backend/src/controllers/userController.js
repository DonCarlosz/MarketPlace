import User from '../models/User.js';
import Listing from '../models/Listing.js';
import Review from '../models/Review.js';

// @desc    Get public user profile and eBay-style 12-month reputation scorecard
// @route   GET /api/users/:id/profile
export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -refreshTokens -failedLoginAttempts -lockUntil');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    // Fetch all reviews for this seller
    const allReviews = await Review.find({ seller: user._id }).sort({ createdAt: -1 });

    // Calculate 12-month scorecard matrix
    const matrix = {
      oneMonth: { positive: 0, neutral: 0, negative: 0 },
      sixMonths: { positive: 0, neutral: 0, negative: 0 },
      twelveMonths: { positive: 0, neutral: 0, negative: 0 },
    };

    let totalItemAccuracy = 0;
    let totalCommunication = 0;
    let totalPunctuality = 0;
    let positiveCount = 0;
    let neutralCount = 0;
    let negativeCount = 0;

    allReviews.forEach((rev) => {
      const revDate = new Date(rev.createdAt);
      const type = rev.ratingType || (rev.stars >= 4 ? 'positive' : rev.stars === 3 ? 'neutral' : 'negative');

      if (type === 'positive') positiveCount++;
      else if (type === 'neutral') neutralCount++;
      else if (type === 'negative') negativeCount++;

      totalItemAccuracy += rev.itemAccuracy || 5;
      totalCommunication += rev.communication || 5;
      totalPunctuality += rev.punctuality || 5;

      if (revDate >= oneMonthAgo) {
        matrix.oneMonth[type]++;
      }
      if (revDate >= sixMonthsAgo) {
        matrix.sixMonths[type]++;
      }
      if (revDate >= twelveMonthsAgo) {
        matrix.twelveMonths[type]++;
      }
    });

    const totalReviews = allReviews.length;
    const positivePercentage =
      totalReviews > 0
        ? Math.round(
            (positiveCount / (positiveCount + negativeCount || 1)) * 100
          )
        : 100;

    const detailedRatings = {
      itemAccuracy: totalReviews > 0 ? Number((totalItemAccuracy / totalReviews).toFixed(1)) : 5.0,
      communication: totalReviews > 0 ? Number((totalCommunication / totalReviews).toFixed(1)) : 5.0,
      punctuality: totalReviews > 0 ? Number((totalPunctuality / totalReviews).toFixed(1)) : 5.0,
    };

    // Count active listings
    const activeListingsCount = await Listing.countDocuments({
      seller: user._id,
      status: 'active',
    });

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        avatar: user.avatar,
        bio: user.bio,
        location: user.location,
        isVerified: user.isVerified,
        verifiedEmail: user.verifiedEmail ?? true,
        verifiedPhone: user.verifiedPhone ?? false,
        createdAt: user.createdAt,
        activeListingsCount,
      },
      reputation: {
        scorecardMatrix: matrix,
        positivePercentage,
        totalReviews,
        positiveCount,
        neutralCount,
        negativeCount,
        detailedRatings,
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
      .populate('seller', 'name avatar location isVerified');

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
      .limit(50);

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

    const {
      listingId,
      ratingType = 'positive',
      stars = 5,
      itemAccuracy = 5,
      communication = 5,
      punctuality = 5,
      comment,
    } = req.body;

    if (!comment || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Feedback comment is required.',
      });
    }

    const review = await Review.create({
      seller: sellerId,
      buyer: buyerId,
      listing: listingId || null,
      ratingType: ['positive', 'neutral', 'negative'].includes(ratingType) ? ratingType : 'positive',
      stars: Math.max(1, Math.min(5, Number(stars) || 5)),
      itemAccuracy: Math.max(1, Math.min(5, Number(itemAccuracy) || 5)),
      communication: Math.max(1, Math.min(5, Number(communication) || 5)),
      punctuality: Math.max(1, Math.min(5, Number(punctuality) || 5)),
      comment: comment.trim(),
    });

    const populatedReview = await Review.findById(review._id)
      .populate('buyer', 'name avatar location')
      .populate('listing', 'title price images');

    // Update seller cached feedback metrics on User model
    const allReviews = await Review.find({ seller: sellerId });
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
      sumAccuracy += r.itemAccuracy || 5;
      sumComm += r.communication || 5;
      sumPunct += r.punctuality || 5;
    });

    const total = allReviews.length;
    const positivePercentage = total > 0 ? Math.round((positive / (positive + negative || 1)) * 100) : 100;

    await User.findByIdAndUpdate(sellerId, {
      'feedbackScore.positive': positive,
      'feedbackScore.neutral': neutral,
      'feedbackScore.negative': negative,
      'feedbackScore.totalReviews': total,
      'feedbackScore.positivePercentage': positivePercentage,
      'detailedRatings.itemAccuracy': Number((sumAccuracy / total).toFixed(1)),
      'detailedRatings.communication': Number((sumComm / total).toFixed(1)),
      'detailedRatings.punctuality': Number((sumPunct / total).toFixed(1)),
    });

    res.status(201).json({
      success: true,
      review: populatedReview,
      message: 'Feedback submitted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
