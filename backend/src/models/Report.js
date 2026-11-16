import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetType: {
      type: String,
      enum: ['listing', 'user'],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'targetTypeRef',
    },
    targetTypeRef: {
      type: String,
      enum: ['Listing', 'User'],
      default: function () {
        return this.targetType === 'listing' ? 'Listing' : 'User';
      },
    },
    reason: {
      type: String,
      enum: ['spam', 'fraud-scam', 'prohibited-item', 'harassment', 'inappropriate-content', 'other'],
      required: true,
    },
    details: {
      type: String,
      maxlength: [1000, 'Details cannot exceed 1000 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'investigating', 'resolved', 'dismissed'],
      default: 'pending',
    },
    resolutionNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const Report = mongoose.model('Report', reportSchema);
export default Report;
