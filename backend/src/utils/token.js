import jwt from 'jsonwebtoken';

export const generateAccessToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'dev_jwt_secret_marketplace_key_2026_secure',
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
};

export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_marketplace_key_2026_secure',
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(
    token,
    process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_marketplace_key_2026_secure'
  );
};
