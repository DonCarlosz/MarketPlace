import rateLimit from 'express-rate-limit';

// Global API rate limiter: 250 requests per 15 minutes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 250,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again in 15 minutes.',
  },
});

// Strict auth limiter (login, refresh): 25 attempts per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again later.',
  },
});

// Strict OTP limiter (send/verify/reset OTP): 10 attempts per 15 minutes
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many verification code attempts. Please wait 15 minutes before trying again.',
  },
});

// Strict guest AI limiter (unauthenticated users): 6 requests per hour per IP to protect Gemini quota
export const guestAiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 6,
  skip: (req) => Boolean(req.user?._id),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'GUEST_AI_LIMIT',
    message:
      'Guest AI preview limit reached (6 questions/hour). Sign in to your free oBuy account for full AI Assistant access.',
  },
});

// Authenticated AI endpoint limiter to protect Gemini quota: 30 requests per 15 minutes
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  skip: (req) => !req.user?._id && req.path === '/chat',
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'oBuy AI rate limit reached. Please wait a few minutes before sending more queries.',
  },
});

// Upload limiter to prevent bandwidth/memory abuse: 30 uploads per 15 minutes
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many file uploads. Please try again shortly.',
  },
});

// Listing creation limiter to curb spam
export const createListingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Hourly listing creation limit reached. Please wait before creating more listings.',
  },
});
