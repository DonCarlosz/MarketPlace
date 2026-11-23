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
import { authLimiter, otpLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Standard Auth
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', authLimiter, refreshToken);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfile);

// OTP-Based Registration & Password Recovery (Strict OTP Rate Limiting)
router.post('/send-signup-otp', otpLimiter, sendSignupOtp);
router.post('/verify-signup-otp', otpLimiter, verifySignupOtp);
router.post('/forgot-password-otp', otpLimiter, sendForgotPasswordOtp);
router.post('/reset-password-otp', otpLimiter, resetPasswordWithOtp);
router.post('/resend-otp', otpLimiter, resendOtp);

export default router;
