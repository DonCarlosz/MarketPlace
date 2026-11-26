import { v2 as cloudinary } from 'cloudinary';
import Media from '../models/Media.js';

let configuredSignature = null;

function ensureCloudinaryConfigured() {
  const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
  const apiKey = (process.env.CLOUDINARY_API_KEY || '').trim();
  const apiSecret = (process.env.CLOUDINARY_API_SECRET || '').trim();

  if (!cloudName || !apiKey || !apiSecret) {
    return false;
  }

  const sig = `${cloudName}|${apiKey}|${apiSecret}`;
  if (configuredSignature !== sig) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    configuredSignature = sig;
  }
  return true;
}

function uploadBufferToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      return resolve(result);
    });
    stream.end(buffer);
  });
}

/**
 * Persist a compressed WebP image to Cloudinary (with automatic MongoDB fallback if misconfigured).
 */
export async function uploadImageAsset({
  buffer,
  filename,
  purpose = 'listing',
  width = 0,
  height = 0,
  uploadedBy = null,
}) {
  const safePurpose = ['avatar', 'cover', 'listing'].includes(purpose) ? purpose : 'listing';

  if (ensureCloudinaryConfigured()) {
    try {
      const folder = `obuy/${safePurpose}s`;
      const publicId = filename.replace(/\.[^/.]+$/, '');
      const result = await uploadBufferToCloudinary(buffer, {
        folder,
        public_id: publicId,
        resource_type: 'image',
        format: 'webp',
        overwrite: true,
      });

      if (result?.secure_url) {
        return {
          url: result.secure_url,
          provider: 'cloudinary',
          publicId: result.public_id,
        };
      }
    } catch (err) {
      console.warn(
        `[Cloudinary] Image upload failed (${err?.message || err}); falling back to MongoDB Media. Check CLOUDINARY_CLOUD_NAME in .env / Render.`
      );
    }
  }

  await Media.create({
    filename,
    contentType: 'image/webp',
    data: buffer,
    size: buffer.length,
    width,
    height,
    purpose: safePurpose,
    uploadedBy,
  });

  return {
    url: `/api/media/${filename}`,
    provider: 'mongodb',
    publicId: filename,
  };
}

/**
 * Persist a transcoded MP3/audio voice note to Cloudinary (with automatic MongoDB fallback).
 */
export async function uploadAudioAsset({
  buffer,
  filename,
  contentType = 'audio/mpeg',
  duration = 1,
  uploadedBy = null,
}) {
  if (ensureCloudinaryConfigured()) {
    try {
      const publicId = filename.replace(/\.[^/.]+$/, '');
      const ext = filename.split('.').pop()?.toLowerCase() || 'mp3';
      // Cloudinary stores audio files under resource_type: 'video'
      const result = await uploadBufferToCloudinary(buffer, {
        folder: 'obuy/voice',
        public_id: publicId,
        resource_type: 'video',
        format: ext,
        overwrite: true,
      });

      if (result?.secure_url) {
        return {
          url: result.secure_url,
          provider: 'cloudinary',
          publicId: result.public_id,
        };
      }
    } catch (err) {
      console.warn(
        `[Cloudinary] Audio upload failed (${err?.message || err}); falling back to MongoDB Media. Check CLOUDINARY_CLOUD_NAME in .env / Render.`
      );
    }
  }

  await Media.create({
    filename,
    contentType,
    data: buffer,
    size: buffer.length,
    duration,
    purpose: 'audio',
    uploadedBy,
  });

  return {
    url: `/api/media/${filename}`,
    provider: 'mongodb',
    publicId: filename,
  };
}

/**
 * Extract Cloudinary resource_type and public_id from a standard res.cloudinary.com URL.
 */
function parseCloudinaryUrl(url) {
  if (typeof url !== 'string' || !url.includes('res.cloudinary.com')) return null;
  try {
    const parsed = new URL(url);
    // Pattern: /<cloud_name>/<resource_type>/upload/(v<digits>/)?<public_id>.<ext>
    const match = parsed.pathname.match(
      /^\/[^/]+\/(image|video|raw)\/upload\/(?:v\d+\/)?(.+)\.[^./]+$/i
    );
    if (!match) return null;
    return {
      resourceType: match[1].toLowerCase(),
      publicId: decodeURIComponent(match[2]),
    };
  } catch {
    return null;
  }
}

/**
 * Delete a single media asset from either Cloudinary or legacy MongoDB Media collection.
 * Safe no-op for external stock/Unsplash URLs; never throws.
 */
export async function deleteMediaAsset(url) {
  if (typeof url !== 'string' || !url.trim()) return false;
  const trimmed = url.trim();

  try {
    // 1. Legacy MongoDB Media document
    const localMatch = trimmed.match(/\/api\/media\/([a-zA-Z0-9._-]+)$/);
    if (localMatch) {
      const res = await Media.deleteOne({ filename: localMatch[1] });
      return res.deletedCount > 0;
    }

    // 2. Cloudinary hosted asset
    const cloudAsset = parseCloudinaryUrl(trimmed);
    if (cloudAsset && ensureCloudinaryConfigured()) {
      const res = await cloudinary.uploader.destroy(cloudAsset.publicId, {
        resource_type: cloudAsset.resourceType,
        invalidate: true,
      });
      return res?.result === 'ok' || res?.result === 'not found';
    }
  } catch (err) {
    console.warn(`[MediaCleanup] Failed to remove orphan asset "${trimmed}":`, err?.message || err);
  }
  return false;
}

/**
 * Delete an array of media URLs in parallel (non-blocking orphan cleanup).
 */
export async function deleteMediaAssets(urls = []) {
  if (!Array.isArray(urls) || urls.length === 0) return;
  const uniqueUrls = [...new Set(urls.filter((u) => typeof u === 'string' && u.trim()))];
  if (uniqueUrls.length === 0) return;
  await Promise.allSettled(uniqueUrls.map((u) => deleteMediaAsset(u)));
}
