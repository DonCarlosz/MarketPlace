import mongoose from 'mongoose';

const listingSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    mode: {
      type: String,
      enum: ['second-hand', 'new', 'service'],
      required: [true, 'Listing mode is required (second-hand, new, or service)'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Please enter a title'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please enter a description'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Please provide a price or base rate (0 for free/quote)'],
      min: [0, 'Price cannot be negative'],
    },
    priceType: {
      type: String,
      enum: ['fixed', 'negotiable', 'starting-at', 'hourly', 'free'],
      default: 'fixed',
    },
    category: {
      type: String,
      required: [true, 'Please select a category'],
      trim: true,
      index: true,
    },
    // Item specific
    condition: {
      type: String,
      enum: ['brand-new', 'like-new', 'good', 'fair', 'for-parts', 'not-applicable'],
      default: function () {
        return this.mode === 'new' ? 'brand-new' : this.mode === 'second-hand' ? 'good' : 'not-applicable';
      },
    },
    // Service specific
    serviceType: {
      type: String,
      trim: true,
      default: '',
    },
    availabilityNotes: {
      type: String,
      maxlength: [300, 'Availability notes cannot exceed 300 characters'],
      default: '',
    },
    // Media
    images: [
      {
        url: { type: String, required: true },
        caption: { type: String, default: '' },
      },
    ],
    // Structured Specifications & Flaws
    itemSpecifics: {
      type: Map,
      of: String,
      default: {},
    },
    flawDescription: {
      type: String,
      maxlength: [500, 'Flaw description cannot exceed 500 characters'],
      default: '',
    },
    // Negotiation & Delivery
    acceptsOffers: {
      type: Boolean,
      default: true,
    },
    minimumOfferPrice: {
      type: Number,
      default: 0,
      min: [0, 'Minimum offer cannot be negative'],
    },
    allowsDelivery: {
      type: Boolean,
      default: false,
    },
    // Location & Meetup guidance
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
      city: {
        type: String,
        required: [true, 'City/Region is required'],
        trim: true,
      },
      neighborhood: {
        type: String,
        trim: true,
        default: '',
      },
    },
    preferredMeetup: {
      type: String,
      maxlength: [300, 'Preferred meetup notes cannot exceed 300 characters'],
      default: 'Public meetup point (café, mall, library, or local safe-exchange zone).',
    },
    status: {
      type: String,
      enum: ['active', 'sold', 'completed', 'inactive'],
      default: 'active',
      index: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    viewedBy: {
      type: [String],
      default: [],
      select: false,
    },
    favoritesCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index for location radius/proximity searches
listingSchema.index({ 'location.coordinates': '2dsphere' });
listingSchema.index({ title: 'text', description: 'text', category: 'text' });

const Listing = mongoose.model('Listing', listingSchema);
export default Listing;
