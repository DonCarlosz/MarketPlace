import { createRequire } from 'module';
import User from '../models/User.js';
import SystemConfig from '../models/SystemConfig.js';

const require = createRequire(import.meta.url);
const webpush = require('web-push');

let cachedVapid = null;
let configured = false;

const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@obuy.ng';

/**
 * Resolves persistent VAPID keys:
 * 1. Uses explicit VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY env vars if set.
 * 2. Otherwise auto-generates once and persists in MongoDB SystemConfig so Render restarts keep the exact same keys.
 */
export async function ensureVapidConfigured() {
  if (configured && cachedVapid) return cachedVapid;

  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    cachedVapid = {
      publicKey: process.env.VAPID_PUBLIC_KEY.trim(),
      privateKey: process.env.VAPID_PRIVATE_KEY.trim(),
    };
  } else {
    let doc = await SystemConfig.findOne({ key: 'web_push_vapid' }).lean();
    if (!doc?.value?.publicKey || !doc?.value?.privateKey) {
      const generated = webpush.generateVAPIDKeys();
      doc = await SystemConfig.findOneAndUpdate(
        { key: 'web_push_vapid' },
        { $setOnInsert: { key: 'web_push_vapid', value: generated } },
        { upsert: true, new: true }
      ).lean();
    }
    cachedVapid = {
      publicKey: doc.value.publicKey,
      privateKey: doc.value.privateKey,
    };
  }

  webpush.setVapidDetails(VAPID_SUBJECT, cachedVapid.publicKey, cachedVapid.privateKey);
  configured = true;
  return cachedVapid;
}

export async function getVapidPublicKey() {
  const keys = await ensureVapidConfigured();
  return keys.publicKey;
}

/**
 * Dispatches a W3C Web Push notification to all registered devices for a user,
 * pruning stale 404/410 endpoints automatically.
 */
export async function sendPushToUser(userId, payload) {
  if (!userId) return;
  try {
    await ensureVapidConfigured();
    const user = await User.findById(userId).select('pushSubscriptions').lean();
    const subs = Array.isArray(user?.pushSubscriptions) ? user.pushSubscriptions : [];
    if (subs.length === 0) return;

    const jsonPayload = JSON.stringify({
      title: payload.title || 'oBuy',
      body: payload.body || 'You have a new update on oBuy.',
      url: payload.url || '/messages',
      tag: payload.tag || 'obuy-notification',
      icon: payload.icon || '/icons/icon-192.png',
      badge: payload.badge || '/icons/icon-192.png',
      unreadCount: payload.unreadCount,
    });

    const staleEndpoints = [];

    await Promise.all(
      subs.map(async (sub) => {
        if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return;
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
            },
            jsonPayload,
            { TTL: 60 * 60 * 12 } // 12 hours
          );
        } catch (err) {
          const status = err?.statusCode;
          if (status === 404 || status === 410) {
            staleEndpoints.push(sub.endpoint);
          } else {
            console.warn('[WebPush] Delivery error:', status || err.message);
          }
        }
      })
    );

    if (staleEndpoints.length > 0) {
      await User.updateOne(
        { _id: userId },
        { $pull: { pushSubscriptions: { endpoint: { $in: staleEndpoints } } } }
      );
    }
  } catch (err) {
    console.warn('[WebPush] Non-blocking push error:', err.message);
  }
}
