import jwt from 'jsonwebtoken';

const getJwtSecret = () => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable must be set in production.');
  }
  return 'obuy_local_dev_jwt_secret_key_2026';
};

const getJwtRefreshSecret = () => {
  if (process.env.JWT_REFRESH_SECRET) return process.env.JWT_REFRESH_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_REFRESH_SECRET environment variable must be set in production.');
  }
  return 'obuy_local_dev_refresh_secret_key_2026';
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, getJwtSecret());
};

export const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  });
};

export const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, getJwtRefreshSecret(), {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, getJwtRefreshSecret());
};
