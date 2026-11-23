import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  otp: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    enum: ['signup', 'forgot_password'],
    default: 'signup',
  },
  pendingUserData: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600, // 10 minutes TTL: MongoDB automatically deletes expired records
  },
});

const Otp = mongoose.model('Otp', otpSchema);
export default Otp;
