/**
 * Security & input sanitization helpers for oBuy Backend
 */

// Escape regex special characters to prevent ReDoS attacks
export const escapeRegex = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Recursively strip MongoDB operator keys ($) and prototype pollution keys
export const sanitizePayload = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizePayload(item));
  }
  if (value && typeof value === 'object') {
    const clean = {};
    for (const [key, val] of Object.entries(value)) {
      if (
        key.startsWith('$') ||
        key.includes('.') ||
        key === '__proto__' ||
        key === 'constructor' ||
        key === 'prototype'
      ) {
        continue;
      }
      clean[key] = sanitizePayload(val);
    }
    return clean;
  }
  return value;
};

// Express middleware to sanitize req.body, req.query, and req.params against NoSQL injection
export const noSqlSanitize = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizePayload(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    const sanitizedQuery = sanitizePayload(req.query);
    Object.keys(req.query).forEach((k) => delete req.query[k]);
    Object.assign(req.query, sanitizedQuery);
  }
  if (req.params && typeof req.params === 'object') {
    const sanitizedParams = sanitizePayload(req.params);
    Object.keys(req.params).forEach((k) => delete req.params[k]);
    Object.assign(req.params, sanitizedParams);
  }
  next();
};

// Validate that an avatar or listing image URL is safe (no javascript:, data:text/html, or broken blob: URLs)
export const isSafeImageUrl = (url) => {
  if (url === '') return true;
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.length > 2048) return false;
  if (trimmed.startsWith('/uploads/')) {
    return !trimmed.includes('..');
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};
