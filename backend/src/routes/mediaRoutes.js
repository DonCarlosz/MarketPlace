import express from 'express';
import Media from '../models/Media.js';

const router = express.Router();

const SAFE_FILENAME_RE = /^[a-zA-Z0-9._-]+$/;

// @route   GET /api/media/:filename
// @desc    Serve persistent uploaded images stored in MongoDB Atlas across all devices/deployments
router.get('/:filename', async (req, res, next) => {
  try {
    const { filename } = req.params;
    if (!filename || !SAFE_FILENAME_RE.test(filename) || filename.includes('..')) {
      return res.status(400).json({ success: false, message: 'Invalid media filename.' });
    }

    const media = await Media.findOne({ filename }).lean();
    if (!media || !media.data) {
      return res.status(404).json({ success: false, message: 'Image not found.' });
    }

    const etag = `"${media._id.toString()}"`;
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    const buffer = Buffer.isBuffer(media.data)
      ? media.data
      : Buffer.from(media.data.buffer || media.data);

    res.set({
      'Content-Type': media.contentType || 'image/webp',
      'Content-Length': buffer.length,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'X-Content-Type-Options': 'nosniff',
      ETag: etag,
    });

    return res.status(200).send(buffer);
  } catch (err) {
    next(err);
  }
});

export default router;
