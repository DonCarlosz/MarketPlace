import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import crypto from 'crypto';
import { protect } from '../middleware/auth.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';
import { transcodeVoiceToMp3 } from '../utils/audioTranscode.js';
import { uploadImageAsset, uploadAudioAsset } from '../services/mediaStorageService.js';

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

const ALLOWED_AUDIO_MIMES = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/aac',
  'audio/x-m4a',
  'video/webm', // Some Chromium builds report MediaRecorder audio-only webm as video/webm
]);

const audioUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max per voice note
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const baseMime = (file.mimetype || '').split(';')[0].trim().toLowerCase();
    if (ALLOWED_AUDIO_MIMES.has(baseMime)) {
      cb(null, true);
    } else {
      cb(new Error('Only valid audio recordings (WebM, OGG, MP4/M4A, MP3, WAV) are accepted.'));
    }
  },
});

const audioExtFromMime = (mime) => {
  if (mime.includes('mp4') || mime.includes('m4a') || mime.includes('aac')) return 'm4a';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
  if (mime.includes('wav')) return 'wav';
  return 'webm';
};

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

      // Persist to Cloudinary CDN (with automatic MongoDB fallback if env vars are absent)
      const stored = await uploadImageAsset({
        buffer: data,
        filename: outputFilename,
        purpose,
        width: info.width,
        height: info.height,
        uploadedBy: req.user?._id || null,
      });

      const originalKb = Math.round(file.size / 1024);
      const compressedKb = Math.round(info.size / 1024);
      const percentSaved = Math.max(0, Math.round((1 - info.size / file.size) * 100));

      processedImages.push({
        url: stored.url,
        storageProvider: stored.provider,
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

// @route   POST /api/upload/audio
// @desc    Transcode voice note to universal iOS/Android MP3 and persist to MongoDB Atlas
router.post('/audio', protect, uploadLimiter, audioUpload.single('audio'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({ success: false, message: 'No audio recording provided.' });
    }

    const baseMime = (req.file.mimetype || 'audio/webm').split(';')[0].trim().toLowerCase();
    const rawContentType = baseMime === 'video/webm' ? 'audio/webm' : baseMime;
    const rawExt = audioExtFromMime(rawContentType);
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const rawDuration = Number(req.body?.duration);
    const duration = Number.isFinite(rawDuration) ? Math.max(1, Math.min(300, Math.round(rawDuration))) : 1;

    let finalBuffer = req.file.buffer;
    let finalContentType = rawContentType;
    let finalExt = rawExt;

    // Transcode to universal MP3 so Android WebM/Opus recordings play natively on iPhone Safari too
    if (rawContentType !== 'audio/mpeg' && rawContentType !== 'audio/mp3') {
      try {
        finalBuffer = await transcodeVoiceToMp3(req.file.buffer, rawExt);
        finalContentType = 'audio/mpeg';
        finalExt = 'mp3';
      } catch (transcodeErr) {
        console.warn('[Voice Transcode] FFmpeg fallback triggered:', transcodeErr.message);
        // Reject unplayable webm/ogg on transcode failure only if truly corrupt; allow native mp4/m4a fallback
        if (!['audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav'].includes(rawContentType)) {
          return res.status(400).json({
            success: false,
            message: 'Unable to process voice recording. Please try recording again.',
          });
        }
      }
    }

    const outputFilename = `voice-${uniqueSuffix}.${finalExt}`;

    const storedAudio = await uploadAudioAsset({
      buffer: finalBuffer,
      filename: outputFilename,
      contentType: finalContentType,
      duration,
      uploadedBy: req.user?._id || null,
    });

    res.status(201).json({
      success: true,
      audio: {
        url: storedAudio.url,
        storageProvider: storedAudio.provider,
        mimeType: finalContentType,
        duration,
        sizeKb: Math.max(1, Math.round(finalBuffer.length / 1024)),
      },
    });
  } catch (err) {
    console.error('Voice upload error:', err.message);
    res.status(400).json({
      success: false,
      message: 'Failed to save voice recording. Please try again.',
    });
  }
});

export default router;
