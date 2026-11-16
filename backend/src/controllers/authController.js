import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/token.js';

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
