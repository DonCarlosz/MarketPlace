import express from 'express';
import Media from '../models/Media.js';

const router = express.Router();

const SAFE_FILENAME_RE = /^[a-zA-Z0-9._-]+$/;

// @route   GET /api/media/:filename
// @desc    Serve persistent uploaded images and voice notes stored in MongoDB Atlas (supports HTTP Range for audio playback)
router.get('/:filename', async (req, res, next) => {
  try {
    const { filename } = req.params;
    if (!filename || !SAFE_FILENAME_RE.test(filename) || filename.includes('..')) {
      return res.status(400).json({ success: false, message: 'Invalid media filename.' });
    }

    const media = await Media.findOne({ filename }).lean();
    if (!media || !media.data) {
      return res.status(404).json({ success: false, message: 'Media file not found.' });
    }

    const etag = `"${media._id.toString()}"`;
    if (req.headers['if-none-match'] === etag && !req.headers.range) {
      return res.status(304).end();
    }

    const buffer = Buffer.isBuffer(media.data)
      ? media.data
      : Buffer.from(media.data.buffer || media.data);
    const totalLength = buffer.length;
    const contentType = media.contentType || 'application/octet-stream';

    // Support HTTP Range requests (required for HTML5 <audio> playback & seeking on iOS Safari and Chrome)
    const range = req.headers.range;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
      if (match) {
        const start = match[1] ? parseInt(match[1], 10) : 0;
        const end = match[2] ? Math.min(parseInt(match[2], 10), totalLength - 1) : totalLength - 1;

        if (start >= totalLength || start > end || start < 0) {
          res.set('Content-Range', `bytes */${totalLength}`);
          return res.status(416).end();
        }

        const chunk = buffer.subarray(start, end + 1);
        res.set({
          'Content-Type': contentType,
          'Content-Length': chunk.length,
          'Content-Range': `bytes ${start}-${end}/${totalLength}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Cross-Origin-Resource-Policy': 'cross-origin',
          'X-Content-Type-Options': 'nosniff',
          ETag: etag,
        });
        return res.status(206).send(chunk);
      }
    }

    res.set({
      'Content-Type': contentType,
      'Content-Length': totalLength,
      'Accept-Ranges': 'bytes',
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
