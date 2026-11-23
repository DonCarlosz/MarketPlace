import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import crypto from 'crypto';
import Media from '../models/Media.js';
import { protect } from '../middleware/auth.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Keep incoming files in memory buffer for immediate Sharp validation & compression
const storage = multer.memoryStorage();

const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/heic',
  'image/heif',
]);

const fileFilter = (req, file, cb) => {
  const validMime = ALLOWED_MIMES.has((file.mimetype || '').toLowerCase());
  const validExt = /\.(jpg|jpeg|png|webp|gif|avif|heic|heif)$/i.test(file.originalname || '');
  if (validMime && validExt) {
    cb(null, true);
  } else {
    cb(new Error('Only valid image files (JPEG, PNG, WebP, GIF, AVIF, HEIC) are accepted.'));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB max per image
    files: 6,
  },
  fileFilter,
});

// @route   POST /api/upload
// @desc    Compress images to lightweight WebP (EXIF stripped) and persist to MongoDB Atlas
router.post('/', protect, uploadLimiter, upload.array('images', 6), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No image files provided.' });
    }

    const rawPurpose = String(req.query.purpose || req.body?.purpose || 'listing').toLowerCase();
    const purpose = ['avatar', 'cover', 'listing'].includes(rawPurpose) ? rawPurpose : 'listing';

    const processedImages = [];

    for (const file of req.files) {
      const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
      const outputFilename = `${purpose}-${uniqueSuffix}.webp`;

      let pipeline = sharp(file.buffer, {
        failOn: 'error',
        limitInputPixels: 100000000, // 100MP decompression-bomb guard
      }).rotate();

      if (purpose === 'avatar') {
        pipeline = pipeline.resize({
          width: 400,
          height: 400,
          fit: 'cover',
          position: 'centre',
        });
      } else if (purpose === 'cover') {
        pipeline = pipeline.resize({
          width: 1400,
          height: 500,
          fit: 'inside',
          withoutEnlargement: true,
        });
      } else {
        pipeline = pipeline.resize({
          width: 1200,
          height: 1200,
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      const { data, info } = await pipeline
        .webp({ quality: purpose === 'listing' ? 80 : 82, effort: 4 })
        .toBuffer({ resolveWithObject: true });

      // Persist in shared MongoDB Atlas so images work across all devices & survive Render restarts
      await Media.create({
        filename: outputFilename,
        contentType: 'image/webp',
        data,
        size: info.size,
        width: info.width,
        height: info.height,
        purpose,
        uploadedBy: req.user?._id || null,
      });

      const originalKb = Math.round(file.size / 1024);
      const compressedKb = Math.round(info.size / 1024);
      const percentSaved = Math.max(0, Math.round((1 - info.size / file.size) * 100));

      processedImages.push({
        url: `/api/media/${outputFilename}`,
        originalName: path.basename(file.originalname || 'image.webp'),
        format: 'webp',
        width: info.width,
        height: info.height,
        sizeKb: compressedKb,
        originalSizeKb: originalKb,
        percentSaved,
      });
    }

    res.status(201).json({
      success: true,
      message: `${processedImages.length} image(s) compressed and stored persistently.`,
      images: processedImages,
    });
  } catch (err) {
    console.error('Image compression error:', err.message);
    res.status(400).json({
      success: false,
      message: 'Failed to process image. Please upload a valid JPG, PNG, or WebP photo.',
    });
  }
});

export default router;
