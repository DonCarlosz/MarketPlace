// Lightweight native-style haptic feedback helper (safe no-op on browsers/OS without Vibration API)
const vibrate = (pattern) => {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    // Ignore unsupported vibration environments
  }
};

export const hapticTap = () => vibrate(8);
export const hapticMedium = () => vibrate(16);
export const hapticLongPress = () => vibrate(24);
export const hapticSuccess = () => vibrate([12, 35, 14]);
export const hapticWarning = () => vibrate([20, 35, 20]);
