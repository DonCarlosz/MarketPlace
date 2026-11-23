import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { protect } from '../middleware/auth.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads');

// Ensure uploads folder exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

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
    fileSize: 8 * 1024 * 1024, // 8MB max per image to prevent memory DoS
    files: 6,
  },
  fileFilter,
});

// @route   POST /api/upload
// @desc    Upload and automatically compress images to ultra-light WebP (EXIF stripped)
router.post('/', protect, uploadLimiter, upload.array('images', 6), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No image files provided.' });
    }

    const processedImages = [];

    for (const file of req.files) {
      const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
      const outputFilename = `opt-${uniqueSuffix}.webp`;
      const outputPath = path.join(uploadsDir, outputFilename);

      // Sharp validation & transformation:
      // 1. Validate real image headers & guard against decompression bombs
      // 2. Resize max dimensions to 1200x1200px (maintains aspect ratio, never upscales)
      // 3. Convert to WebP at 80% quality and strip EXIF / GPS metadata for user privacy
      const info = await sharp(file.buffer, {
        failOn: 'error',
        limitInputPixels: 100000000, // 100MP max input guard
      })
        .rotate()
        .resize({
          width: 1200,
          height: 1200,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 80, effort: 4 })
        .toFile(outputPath);

      const originalKb = Math.round(file.size / 1024);
      const compressedKb = Math.round(info.size / 1024);
      const percentSaved = Math.max(0, Math.round((1 - info.size / file.size) * 100));

      processedImages.push({
        url: `/uploads/${outputFilename}`,
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
      message: `${processedImages.length} image(s) compressed and stored successfully.`,
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
