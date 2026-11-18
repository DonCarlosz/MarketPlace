import User from '../models/User.js';
import Otp from '../models/Otp.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/token.js';
import { sendOtpEmail } from '../utils/email.js';

// @desc    Send 6-digit OTP for signup verification
// @route   POST /api/auth/send-signup-otp
export const sendSignupOtp = async (req, res, next) => {
  try {
    const { name, email, password, city, neighborhood, coordinates } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email is already registered. Please log in or use Forgot Password.',
      });
    }

    // Generate random 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Remove any previous pending signup OTP for this email
    await Otp.deleteMany({ email: cleanEmail, purpose: 'signup' });

    // Store OTP with pending registration details
    await Otp.create({
      email: cleanEmail,
      otp,
      purpose: 'signup',
      pendingUserData: {
        name: name.trim(),
        email: cleanEmail,
        password,
        location: {
          city: city || 'Local Area',
          neighborhood: neighborhood || '',
          coordinates: coordinates && coordinates.length === 2 ? coordinates : [0, 0],
        },
      },
    });

    // Send email via Brevo
    await sendOtpEmail({
      toEmail: cleanEmail,
      toName: name.trim(),
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

    if (!email || !otp) {
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

    if (otpRecord.otp !== cleanOtp) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect verification code. Please check your email and try again.',
      });
    }

    const pendingData = otpRecord.pendingUserData;
    if (!pendingData) {
      return res.status(400).json({
        success: false,
        message: 'Registration session expired. Please start registration again.',
      });
    }

    // Verify user doesn't exist already as verified
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
      await user.save();
    } else {
      user = await User.create({
        ...pendingData,
        isVerified: true,
      });
    }

    // Clean up OTP record
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
        role: user.role,
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

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your registered email',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account registered with this email address.',
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.deleteMany({ email: cleanEmail, purpose: 'forgot_password' });

    await Otp.create({
      email: cleanEmail,
      otp,
      purpose: 'forgot_password',
    });

    await sendOtpEmail({
      toEmail: cleanEmail,
      toName: user.name,
      otp,
      purpose: 'forgot_password',
    });

    res.json({
      success: true,
      message: `A 6-digit password reset code has been sent to ${cleanEmail}.`,
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

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, verification code, and new password are required',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long',
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

    if (otpRecord.otp !== cleanOtp) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect verification code. Please check your email.',
      });
    }

    const user = await User.findOne({ email: cleanEmail }).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found',
      });
    }

    // Update password (triggers User pre-save hash hook)
    user.password = newPassword;
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    // Clean up OTP record
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

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required to resend code',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    const existingOtp = await Otp.findOne({ email: cleanEmail, purpose }).sort({
      createdAt: -1,
    });

    if (!existingOtp) {
      return res.status(400).json({
        success: false,
        message: 'No pending verification found. Please start over.',
      });
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    existingOtp.otp = newOtp;
    existingOtp.createdAt = new Date(); // Reset 10m TTL
    await existingOtp.save();

    const userName = existingOtp.pendingUserData?.name || 'Member';

    await sendOtpEmail({
      toEmail: cleanEmail,
      toName: userName,
      otp: newOtp,
      purpose,
    });

    res.json({
      success: true,
      message: `A new 6-digit verification code has been sent to ${cleanEmail}.`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register a new user
// @route   POST /api/auth/register
export const register = async (req, res, next) => {
  try {
    const { name, email, password, city, neighborhood, coordinates } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    const userData = {
      name,
      email: email.toLowerCase(),
      password,
      location: {
        city: city || 'Local Area',
        neighborhood: neighborhood || '',
        coordinates: coordinates && coordinates.length === 2 ? coordinates : [0, 0],
      },
    };

    const user = await User.create(userData);

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      accessToken,
      refreshToken,
      user: {
        _id: user._id.toString(),
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        location: user.location,
        avatar: user.avatar,
        role: user.role,
        favorites: user.favorites || [],
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user with rate-limiting and progressive lockout check
// @route   POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

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
      const remainingAttempts = Math.max(0, 5 - user.failedLoginAttempts);
      return res.status(401).json({
        success: false,
        message: remainingAttempts > 0
          ? `Invalid credentials. ${remainingAttempts} attempts remaining before temporary lockout.`
          : 'Invalid credentials. Account has now been locked for 15 minutes.',
      });
    }

    // Reset failed attempts on success
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
        role: user.role,
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

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (err) {
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

    // Check if token exists in user's active tokens list
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

    if (token && req.user) {
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
    const { name, bio, phone, avatar, city, neighborhood, coordinates } = req.body;

    const updateFields = {};
    if (name) updateFields.name = name;
    if (bio !== undefined) updateFields.bio = bio;
    if (phone !== undefined) updateFields.phone = phone;
    if (avatar !== undefined) updateFields.avatar = avatar;

    if (city !== undefined || neighborhood !== undefined || coordinates !== undefined) {
      updateFields.location = {
        city: city ?? req.user.location.city,
        neighborhood: neighborhood ?? req.user.location.neighborhood,
        coordinates: coordinates ?? req.user.location.coordinates,
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
