import API from '../services/api';

export const PERMISSION_META = {
  notifications: {
    id: 'notifications',
    label: 'Notifications',
    shortLabel: 'Push Alerts',
    purpose: 'Instant alerts for new buyer messages, price offers, and message requests even when oBuy is closed.',
    warmHeadline: 'Stay updated on offers & messages',
    warmBody:
      'Allow notifications so you never miss a buyer message, counter-offer, or meetup update while oBuy is closed.',
    allowButtonText: 'Turn On Notifications',
  },
  microphone: {
    id: 'microphone',
    label: 'Microphone',
    shortLabel: 'Voice Notes',
    purpose: 'Record and send quick voice notes inside oBuy buyer/seller chats.',
    warmHeadline: 'Allow microphone for voice notes',
    warmBody:
      'oBuy only uses your microphone while you are actively recording a voice note inside a conversation.',
    allowButtonText: 'Allow Microphone',
  },
  geolocation: {
    id: 'geolocation',
    label: 'Location',
    shortLabel: 'Nearby & Safe Meetups',
    purpose: 'Find nearby deals and suggest verified safe public meetup spots closest to you.',
    warmHeadline: 'Use your location for safe meetups',
    warmBody:
      'oBuy uses your approximate city/GPS only when you look for nearby listings or safe meetup spots. We never share your live location with other users.',
    allowButtonText: 'Allow Location',
  },
  camera: {
    id: 'camera',
    label: 'Camera',
    shortLabel: 'Listing Photos',
    purpose: 'Snap clear photos of items directly when posting a listing or updating your profile.',
    warmHeadline: 'Allow camera for listing photos',
    warmBody:
      'Let oBuy access your camera when you want to take fresh item photos directly inside the listing wizard.',
    allowButtonText: 'Allow Camera',
  },
};

export function detectDevicePlatform() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    window.navigator.standalone === true;
  const isIOS =
    /iPad|iPhone|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);

  if (isIOS) return isStandalone ? 'ios-pwa' : 'ios-safari';
  if (isAndroid) return isStandalone ? 'android-pwa' : 'android-browser';
  return 'desktop';
}

export async function queryPermissionState(type) {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'unsupported';

  if (type === 'notifications') {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    return 'prompt';
  }

  if (type === 'geolocation' && !('geolocation' in navigator)) return 'unsupported';
  if ((type === 'microphone' || type === 'camera') && !navigator.mediaDevices?.getUserMedia) {
    return 'unsupported';
  }

  if (navigator.permissions?.query) {
    try {
      const status = await navigator.permissions.query({ name: type });
      if (status?.state === 'granted' || status?.state === 'denied' || status?.state === 'prompt') {
        return status.state;
      }
    } catch {
      // Safari/iOS may not support permissions.query for microphone/camera
    }
  }

  return 'prompt';
}

export async function queryAllPermissionStates() {
  const [notifications, microphone, geolocation, camera] = await Promise.all([
    queryPermissionState('notifications'),
    queryPermissionState('microphone'),
    queryPermissionState('geolocation'),
    queryPermissionState('camera'),
  ]);
  return { notifications, microphone, geolocation, camera };
}

/**
 * Watch a specific permission for live OS changes (PermissionStatus.onchange + focus/visibility return).
 */
export function watchPermissionState(type, onChange) {
  if (typeof window === 'undefined') return () => {};
  let permStatus = null;
  let active = true;

  const checkNow = async () => {
    const next = await queryPermissionState(type);
    if (active) onChange(next);
  };

  if (navigator.permissions?.query && type !== 'notifications') {
    navigator.permissions
      .query({ name: type })
      .then((status) => {
        if (!active) return;
        permStatus = status;
        permStatus.onchange = () => {
          if (active) onChange(permStatus.state);
        };
      })
      .catch(() => {});
  }

  const onVisibility = () => {
    if (!document.hidden) checkNow();
  };
  const onFocus = () => checkNow();

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('focus', onFocus);

  return () => {
    active = false;
    if (permStatus) permStatus.onchange = null;
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('focus', onFocus);
  };
}

/**
 * Invoke the native browser permission dialog for the given permission type.
 */
export async function requestRawPermission(type) {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'unsupported';

  if (type === 'notifications') {
    if (!('Notification' in window)) return 'unsupported';
    try {
      const result = await Notification.requestPermission();
      return result === 'default' ? 'prompt' : result;
    } catch {
      return 'denied';
    }
  }

  if (type === 'microphone') {
    if (!navigator.mediaDevices?.getUserMedia) return 'unsupported';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      return 'granted';
    } catch (err) {
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        return 'denied';
      }
      return 'prompt';
    }
  }

  if (type === 'camera') {
    if (!navigator.mediaDevices?.getUserMedia) return 'unsupported';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      stream.getTracks().forEach((t) => t.stop());
      return 'granted';
    } catch (err) {
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        return 'denied';
      }
      return 'prompt';
    }
  }

  if (type === 'geolocation') {
    if (!navigator.geolocation) return 'unsupported';
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve('granted'),
        (err) => {
          if (err?.code === 1) resolve('denied');
          else resolve('prompt');
        },
        { timeout: 8000 }
      );
    });
  }

  return 'unsupported';
}

/**
 * Tailored 2-step OS-specific recovery instructions when a user previously tapped Block/Deny.
 */
export function getRecoveryGuide(type, platform = detectDevicePlatform()) {
  const label = PERMISSION_META[type]?.label || 'this permission';

  if (platform === 'android-pwa') {
    return {
      deviceLabel: 'Android App',
      steps: [
        `Long-press the oBuy icon on your Home Screen and tap Site settings.`,
        `Open Site settings -> tap ${label} -> choose Allow, then return to oBuy.`,
      ],
      tip: 'No need to clear cache or reinstall oBuy.',
    };
  }

  if (platform === 'android-browser') {
    return {
      deviceLabel: 'Android Browser',
      steps: [
        `Tap the tune icon on the left side of the address bar.`,
        `Tap Permissions -> turn on ${label}, then return here.`,
      ],
      tip: 'No need to clear cache.',
    };
  }

  if (platform === 'ios-pwa') {
    return {
      deviceLabel: 'iPhone App',
      steps: [
        `Open your iPhone Settings app and tap Safari.`,
        `Tap ${label} -> choose Allow, then return to oBuy.`,
      ],
      tip: 'No need to reinstall oBuy.',
    };
  }

  if (platform === 'ios-safari') {
    return {
      deviceLabel: 'iPhone Safari',
      steps: [
        `Tap the page settings icon in Safari's address bar and tap Website Settings.`,
        `Set ${label} to Allow, tap Done, and return here.`,
      ],
      tip: 'No need to clear cache.',
    };
  }

  return {
    deviceLabel: 'Desktop Browser',
    steps: [
      `Click the tune icon on the left side of the address bar.`,
      `Set ${label} to Allow, then click Re-check below.`,
    ],
    tip: 'No need to clear site data or cookies.',
  };
}

/**
 * Sync unread message count onto the home-screen app icon badge (PWA Badging API).
 */
export function syncAppBadge(count) {
  if (typeof navigator === 'undefined') return;
  try {
    const safeCount = Math.max(0, Number(count) || 0);
    if (safeCount > 0 && typeof navigator.setAppBadge === 'function') {
      navigator.setAppBadge(safeCount).catch(() => {});
    } else if (safeCount === 0 && typeof navigator.clearAppBadge === 'function') {
      navigator.clearAppBadge().catch(() => {});
    }
  } catch {
    // Gracefully ignored on browsers without Badging API
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Register or refresh this device's W3C Web Push subscription with the oBuy backend.
 */
export async function subscribeToWebPush() {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !('Notification' in window)
  ) {
    return { ok: false, reason: 'unsupported' };
  }

  if (Notification.permission !== 'granted') {
    return { ok: false, reason: 'not-granted' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const vapidRes = await API.get('/notifications/vapid-public-key');
    const publicKey = vapidRes.data?.publicKey;
    if (!publicKey) return { ok: false, reason: 'no-vapid' };

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    const subJson = subscription.toJSON();
    await API.post('/notifications/subscribe', {
      subscription: {
        endpoint: subJson.endpoint,
        keys: subJson.keys,
      },
    });

    return { ok: true, subscription };
  } catch (err) {
    console.warn('[WebPush] Subscribe skipped:', err?.message || err);
    return { ok: false, reason: err?.message || 'subscribe-failed' };
  }
}

export async function unsubscribeFromWebPush() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return true;
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await API.delete('/notifications/unsubscribe', { data: { endpoint } }).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

export async function sendTestPushNotification() {
  const res = await API.post('/notifications/test');
  return res.data;
}
