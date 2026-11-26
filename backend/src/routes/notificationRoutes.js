import express from 'express';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { getVapidPublicKey, sendPushToUser } from '../services/pushService.js';

const router = express.Router();

// @route   GET /api/notifications/vapid-public-key
// @desc    Return public VAPID key so installed PWAs can subscribe to Web Push
router.get('/vapid-public-key', async (req, res, next) => {
  try {
    const publicKey = await getVapidPublicKey();
    res.json({ success: true, publicKey });
  } catch (err) {
    next(err);
  }
});

// @route   POST /api/notifications/subscribe
// @desc    Save or update a browser PushSubscription for the authenticated user
router.post('/subscribe', protect, async (req, res, next) => {
  try {
    const { subscription } = req.body;
    const endpoint = typeof subscription?.endpoint === 'string' ? subscription.endpoint.trim() : '';
    const p256dh = typeof subscription?.keys?.p256dh === 'string' ? subscription.keys.p256dh.trim() : '';
    const auth = typeof subscription?.keys?.auth === 'string' ? subscription.keys.auth.trim() : '';

    if (!endpoint || !endpoint.startsWith('https://') || !p256dh || !auth) {
      return res.status(400).json({
        success: false,
        message: 'A valid HTTPS PushSubscription with p256dh and auth keys is required.',
      });
    }

    const userAgent = String(req.headers['user-agent'] || '').slice(0, 180);

    // Replace existing entry for same endpoint and keep up to 6 active devices per user
    await User.updateOne(
      { _id: req.user._id },
      { $pull: { pushSubscriptions: { endpoint } } }
    );

    await User.updateOne(
      { _id: req.user._id },
      {
        $push: {
          pushSubscriptions: {
            $each: [{ endpoint, keys: { p256dh, auth }, userAgent, createdAt: new Date() }],
            $slice: -6,
          },
        },
      }
    );

    res.status(201).json({ success: true, message: 'Push notifications enabled for this device.' });
  } catch (err) {
    next(err);
  }
});

// @route   DELETE /api/notifications/unsubscribe
// @desc    Remove a browser PushSubscription for the authenticated user
router.delete('/unsubscribe', protect, async (req, res, next) => {
  try {
    const endpoint = typeof req.body?.endpoint === 'string' ? req.body.endpoint.trim() : '';
    if (endpoint) {
      await User.updateOne(
        { _id: req.user._id },
        { $pull: { pushSubscriptions: { endpoint } } }
      );
    }
    res.json({ success: true, message: 'Push subscription removed.' });
  } catch (err) {
    next(err);
  }
});

// @route   POST /api/notifications/test
// @desc    Send a test push notification to verify device push delivery
router.post('/test', protect, async (req, res, next) => {
  try {
    await sendPushToUser(req.user._id, {
      title: 'oBuy Notifications Active',
      body: 'You will receive instant alerts for buyer messages, offers, and voice notes even when oBuy is closed.',
      url: '/messages',
      tag: 'obuy-test-push',
    });
    res.json({ success: true, message: 'Test notification dispatched.' });
  } catch (err) {
    next(err);
  }
});

export default router;
