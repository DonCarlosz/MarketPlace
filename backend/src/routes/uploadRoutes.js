import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads');

// Ensure uploads folder exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Keep incoming files in memory buffer for immediate Sharp processing
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/heic'];
  if (allowedMimes.includes(file.mimetype.toLowerCase()) || file.originalname.match(/\.(jpg|jpeg|png|webp|gif|avif|heic)$/i)) {
    cb(null, true);
  } else {
    cb(new Error('Only valid image files (JPEG, PNG, WebP, GIF, AVIF, HEIC) are accepted.'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // Accept up to 15MB initial uploads to compress
  fileFilter,
});

// @route   POST /api/upload
// @desc    Upload and automatically compress images to ultra-light WebP
router.post('/', protect, upload.array('images', 6), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No image files provided.' });
    }

    const processedImages = [];

    for (const file of req.files) {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const outputFilename = `opt-${uniqueSuffix}.webp`;
      const outputPath = path.join(uploadsDir, outputFilename);

      // Sharp transformation:
      // 1. Resize max dimensions to 1200x1200px (maintains aspect ratio, never upscales small images)
      // 2. Convert to modern WebP format at 80% quality
      // 3. Strip all EXIF / GPS location metadata for privacy
      const info = await sharp(file.buffer)
        .rotate() // auto-orient based on EXIF before stripping
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

      console.log(
        `⚡ Compressed [${file.originalname}]: ${originalKb} KB ➔ ${compressedKb} KB (${percentSaved}% space saved)`
      );

      processedImages.push({
        url: `/uploads/${outputFilename}`,
        originalName: file.originalname,
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
    console.error('Image compression error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to process and compress image: ' + err.message,
    });
  }
});

export default router;
