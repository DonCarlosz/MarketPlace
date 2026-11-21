import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
    },
    ratingType: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      required: true,
      default: 'positive',
    },
    stars: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    itemAccuracy: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    communication: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    punctuality: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
      required: [true, 'Please provide feedback comments'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reviewSchema.index({ seller: 1, createdAt: -1 });

const Review = mongoose.model('Review', reviewSchema);
export default Review;
