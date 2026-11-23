import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import validator from 'validator';
import User from '../models/User.js';
import Otp from '../models/Otp.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/token.js';
import { sendOtpEmail } from '../utils/email.js';
import { isSafeImageUrl } from '../utils/sanitize.js';

const MAX_OTP_ATTEMPTS = 5;

const generateSecureOtp = () => crypto.randomInt(100000, 1000000).toString();

const safeOtpCompare = (storedOtp, submittedOtp) => {
  if (typeof storedOtp !== 'string' || typeof submittedOtp !== 'string') return false;
  const bufA = Buffer.from(storedOtp);
  const bufB = Buffer.from(submittedOtp);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

// @desc    Send 6-digit OTP for signup verification
// @route   POST /api/auth/send-signup-otp
export const sendSignupOtp = async (req, res, next) => {
  try {
    const { name, email, password, city, neighborhood, coordinates } = req.body;

    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    if (!validator.isEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({
        success: false,
        message: 'Password must be between 8 and 128 characters long',
      });
    }

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email is already registered. Please log in or use Forgot Password.',
      });
    }

    // Generate cryptographically secure 6-digit numeric OTP
    const otp = generateSecureOtp();

    // Hash password BEFORE storing in temporary OTP collection (never persist plaintext passwords)
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    await Otp.deleteMany({ email: cleanEmail, purpose: 'signup' });

    await Otp.create({
      email: cleanEmail,
      otp,
      purpose: 'signup',
      attempts: 0,
      pendingUserData: {
        name: name.trim().slice(0, 60),
        email: cleanEmail,
        password: hashedPassword,
        location: {
          city: typeof city === 'string' && city.trim() ? city.trim().slice(0, 80) : 'Local Area',
          neighborhood: typeof neighborhood === 'string' ? neighborhood.trim().slice(0, 80) : '',
          coordinates:
            Array.isArray(coordinates) &&
            coordinates.length === 2 &&
            coordinates.every((c) => typeof c === 'number' && Number.isFinite(c))
              ? coordinates
              : [0, 0],
        },
      },
    });

    await sendOtpEmail({
      toEmail: cleanEmail,
      toName: name.trim().slice(0, 60),
      otp,
      purpose: 'signup',
    });

    res.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${cleanEmail}. Please enter it to complete registration.`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify signup OTP & create account
// @route   POST /api/auth/verify-signup-otp
export const verifySignupOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (typeof email !== 'string' || !email.trim() || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and 6-digit verification code are required',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();

    const otpRecord = await Otp.findOne({ email: cleanEmail, purpose: 'signup' }).sort({
      createdAt: -1,
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired or was not requested. Please request a new code.',
      });
    }

    if ((otpRecord.attempts || 0) >= MAX_OTP_ATTEMPTS) {
      await Otp.deleteMany({ email: cleanEmail, purpose: 'signup' });
      return res.status(429).json({
        success: false,
        message: 'Too many failed verification attempts. Please request a fresh code.',
      });
    }

    if (!safeOtpCompare(otpRecord.otp, cleanOtp)) {
      otpRecord.attempts = (otpRecord.attempts || 0) + 1;
      await otpRecord.save();
      const remaining = Math.max(0, MAX_OTP_ATTEMPTS - otpRecord.attempts);
      return res.status(400).json({
        success: false,
        message:
          remaining > 0
            ? `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
            : 'Too many incorrect attempts. Please request a new verification code.',
      });
    }

    const pendingData = otpRecord.pendingUserData;
    if (!pendingData) {
      return res.status(400).json({
        success: false,
        message: 'Registration session expired. Please start registration again.',
      });
    }

    let user = await User.findOne({ email: cleanEmail });
    if (user && user.isVerified) {
      await Otp.deleteMany({ email: cleanEmail });
      return res.status(400).json({
        success: false,
        message: 'An account with this email is already registered. Please log in.',
      });
    }

    if (user && !user.isVerified) {
      user.name = pendingData.name;
      user.password = pendingData.password;
      user.location = pendingData.location;
      user.isVerified = true;
      user.verifiedEmail = true;
      await user.save();
    } else {
      user = await User.create({
        ...pendingData,
        isVerified: true,
        verifiedEmail: true,
      });
    }

    await Otp.deleteMany({ email: cleanEmail, purpose: 'signup' });

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Email verified and account created successfully!',
      accessToken,
      refreshToken,
      user: {
        _id: user._id.toString(),
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        location: user.location,
        avatar: user.avatar,
        coverImage: user.coverImage || '',
        role: user.role,
        isVerified: user.isVerified,
        favorites: user.favorites || [],
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send OTP for forgotten password
// @route   POST /api/auth/forgot-password-otp
export const sendForgotPasswordOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your registered email',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    if (!validator.isEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    const user = await User.findOne({ email: cleanEmail });

    // Prevent account enumeration: respond consistently even if account does not exist
    if (!user) {
      return res.json({
        success: true,
        message: `If an account exists for ${cleanEmail}, a 6-digit password reset code has been sent.`,
      });
    }

    const otp = generateSecureOtp();

    await Otp.deleteMany({ email: cleanEmail, purpose: 'forgot_password' });

    await Otp.create({
      email: cleanEmail,
      otp,
      purpose: 'forgot_password',
      attempts: 0,
    });

    await sendOtpEmail({
      toEmail: cleanEmail,
      toName: user.name,
      otp,
      purpose: 'forgot_password',
    });

    res.json({
      success: true,
      message: `If an account exists for ${cleanEmail}, a 6-digit password reset code has been sent.`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password with OTP
// @route   POST /api/auth/reset-password-otp
export const resetPasswordWithOtp = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (typeof email !== 'string' || !email.trim() || !otp || typeof newPassword !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Email, verification code, and new password are required',
      });
    }

    if (newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({
        success: false,
        message: 'New password must be between 8 and 128 characters long',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();

    const otpRecord = await Otp.findOne({
      email: cleanEmail,
      purpose: 'forgot_password',
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Password reset code has expired. Please request a new code.',
      });
    }

    if ((otpRecord.attempts || 0) >= MAX_OTP_ATTEMPTS) {
      await Otp.deleteMany({ email: cleanEmail, purpose: 'forgot_password' });
      return res.status(429).json({
        success: false,
        message: 'Too many failed verification attempts. Please request a fresh reset code.',
      });
    }

    if (!safeOtpCompare(otpRecord.otp, cleanOtp)) {
      otpRecord.attempts = (otpRecord.attempts || 0) + 1;
      await otpRecord.save();
      const remaining = Math.max(0, MAX_OTP_ATTEMPTS - otpRecord.attempts);
      return res.status(400).json({
        success: false,
        message:
          remaining > 0
            ? `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
            : 'Too many incorrect attempts. Please request a fresh reset code.',
      });
    }

    const user = await User.findOne({ email: cleanEmail }).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found',
      });
    }

    // Update password and revoke ALL active refresh tokens across all devices
    user.password = newPassword;
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.refreshTokens = [];
    await user.save();

    await Otp.deleteMany({ email: cleanEmail, purpose: 'forgot_password' });

    res.json({
      success: true,
      message: 'Password has been reset successfully! You can now log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
export const resendOtp = async (req, res, next) => {
  try {
    const { email, purpose = 'signup' } = req.body;

    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email is required to resend code',
      });
    }

    const validPurpose = purpose === 'forgot_password' ? 'forgot_password' : 'signup';
    const cleanEmail = email.toLowerCase().trim();

    const existingOtp = await Otp.findOne({ email: cleanEmail, purpose: validPurpose }).sort({
      createdAt: -1,
    });

    if (!existingOtp) {
      return res.status(400).json({
        success: false,
        message: 'No pending verification found. Please start over.',
      });
    }

    const newOtp = generateSecureOtp();
    existingOtp.otp = newOtp;
    existingOtp.attempts = 0;
    existingOtp.createdAt = new Date(); // Reset 10m TTL
    await existingOtp.save();

    const userName = existingOtp.pendingUserData?.name || 'Member';

    await sendOtpEmail({
      toEmail: cleanEmail,
      toName: userName,
      otp: newOtp,
      purpose: validPurpose,
    });

    res.json({
      success: true,
      message: `A new 6-digit verification code has been sent to ${cleanEmail}.`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Legacy direct registration disabled to enforce OTP email verification
// @route   POST /api/auth/register
export const register = async (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Email verification is required to create an oBuy account. Please register using the 6-digit email verification code.',
  });
};

// @desc    Login user with rate-limiting and progressive lockout check
// @route   POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check account lockout
    if (user.isLocked()) {
      const minutesRemaining = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
      return res.status(423).json({
        success: false,
        message: `Account is temporarily locked due to excessive failed attempts. Try again in ${minutesRemaining} minutes.`,
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      await user.handleFailedLogin();
      if (user.isLocked()) {
        return res.status(423).json({
          success: false,
          message: 'Account temporarily locked for 15 minutes due to multiple failed login attempts.',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    await user.resetFailedLogin();

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Keep up to 5 concurrent sessions
    if (user.refreshTokens.length >= 5) {
      user.refreshTokens.shift();
    }
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    res.json({
      success: true,
      message: 'Logged in successfully',
      accessToken,
      refreshToken,
      user: {
        _id: user._id.toString(),
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        location: user.location,
        avatar: user.avatar,
        coverImage: user.coverImage || '',
        role: user.role,
        isVerified: user.isVerified,
        favorites: user.favorites || [],
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
export const refreshToken = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (typeof token !== 'string' || !token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired refresh token. Please log in again.',
      });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User no longer exists',
      });
    }

    const tokenExists = user.refreshTokens.some((t) => t.token === token);
    if (!tokenExists) {
      return res.status(403).json({
        success: false,
        message: 'Refresh token has been revoked. Please log in again.',
      });
    }

    const newAccessToken = generateAccessToken(user._id);

    res.json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout / revoke refresh token
// @route   POST /api/auth/logout
export const logout = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (typeof token === 'string' && token && req.user) {
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { refreshTokens: { token } },
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-refreshTokens');
    res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current user profile
// @route   PUT /api/auth/me
export const updateProfile = async (req, res, next) => {
  try {
    const { name, bio, phone, avatar, coverImage, city, neighborhood, coordinates } = req.body;

    const updateFields = {};
    if (typeof name === 'string' && name.trim()) {
      updateFields.name = name.trim().slice(0, 60);
    }
    if (typeof bio === 'string') {
      updateFields.bio = bio.trim().slice(0, 300);
    }
    if (typeof phone === 'string') {
      updateFields.phone = phone.trim().slice(0, 25);
    }
    if (avatar !== undefined) {
      if (!isSafeImageUrl(avatar)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid profile image URL.',
        });
      }
      updateFields.avatar = typeof avatar === 'string' ? avatar.trim() : '';
    }
    if (coverImage !== undefined) {
      if (!isSafeImageUrl(coverImage)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid cover image URL.',
        });
      }
      updateFields.coverImage = typeof coverImage === 'string' ? coverImage.trim() : '';
    }

    if (city !== undefined || neighborhood !== undefined || coordinates !== undefined) {
      updateFields.location = {
        type: 'Point',
        city: typeof city === 'string' && city.trim() ? city.trim().slice(0, 80) : req.user.location?.city || '',
        neighborhood:
          typeof neighborhood === 'string'
            ? neighborhood.trim().slice(0, 80)
            : req.user.location?.neighborhood || '',
        coordinates:
          Array.isArray(coordinates) &&
          coordinates.length === 2 &&
          coordinates.every((c) => typeof c === 'number' && Number.isFinite(c))
            ? coordinates
            : req.user.location?.coordinates || [0, 0],
      };
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-refreshTokens');

    res.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};
