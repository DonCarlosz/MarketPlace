import express from 'express';
import {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  updateProfile,
  sendSignupOtp,
  verifySignupOtp,
  sendForgotPasswordOtp,
  resetPasswordWithOtp,
  resendOtp,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Standard Auth
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', refreshToken);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfile);

// OTP-Based Registration & Password Recovery
router.post('/send-signup-otp', authLimiter, sendSignupOtp);
router.post('/verify-signup-otp', authLimiter, verifySignupOtp);
router.post('/forgot-password-otp', authLimiter, sendForgotPasswordOtp);
router.post('/reset-password-otp', authLimiter, resetPasswordWithOtp);
router.post('/resend-otp', authLimiter, resendOtp);

export default router;
