import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  queryAllPermissionStates,
  queryPermissionState,
  requestRawPermission,
  watchPermissionState,
  subscribeToWebPush,
} from '../utils/permissions';
import { useAuth } from './AuthContext';
import PermissionsSheet from '../components/PermissionsSheet';

const PermissionContext = createContext({
  states: {
    notifications: 'prompt',
    microphone: 'prompt',
    geolocation: 'prompt',
    camera: 'prompt',
  },
  refreshAllStates: async () => {},
  openPermissionsCenter: () => {},
  openRecoveryGuide: () => {},
  ensurePermission: async () => 'prompt',
});

export function PermissionProvider({ children }) {
  const { user } = useAuth();
  const [states, setStates] = useState({
    notifications: 'prompt',
    microphone: 'prompt',
    geolocation: 'prompt',
    camera: 'prompt',
  });

  // Active sheet mode: null | { mode: 'center' } | { mode: 'warm', type, customReason } | { mode: 'recovery', type }
  const [sheetState, setSheetState] = useState(null);
  const pendingCallbackRef = useRef(null);
  const pendingResolveRef = useRef(null);

  const refreshAllStates = useCallback(async () => {
    const next = await queryAllPermissionStates();
    setStates(next);
    return next;
  }, []);

  // Load initial permission states & keep refreshed whenever user switches back from OS Settings
  useEffect(() => {
    refreshAllStates();
    const onVisibility = () => {
      if (!document.hidden) refreshAllStates();
    };
    const onFocus = () => refreshAllStates();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshAllStates]);

  // Live watch when Recovery Sheet is open so flipping permission in OS Settings auto-resumes!
  useEffect(() => {
    if (!sheetState || sheetState.mode !== 'recovery' || !sheetState.type) return undefined;
    const type = sheetState.type;

    return watchPermissionState(type, async (nextState) => {
      setStates((prev) => ({ ...prev, [type]: nextState }));
      if (nextState === 'granted') {
        if (type === 'notifications' && user) {
          subscribeToWebPush().catch(() => {});
        }
        setSheetState(null);
        const cb = pendingCallbackRef.current;
        const resolver = pendingResolveRef.current;
        pendingCallbackRef.current = null;
        pendingResolveRef.current = null;
        if (resolver) resolver('granted');
        if (cb) cb();
      }
    });
  }, [sheetState, user]);

  const closeSheet = useCallback(() => {
    setSheetState(null);
    const resolver = pendingResolveRef.current;
    pendingCallbackRef.current = null;
    pendingResolveRef.current = null;
    if (resolver) resolver('dismissed');
  }, []);

  const openPermissionsCenter = useCallback(() => {
    refreshAllStates();
    setSheetState({ mode: 'center' });
  }, [refreshAllStates]);

  const openRecoveryGuide = useCallback((type, onGranted = null) => {
    pendingCallbackRef.current = typeof onGranted === 'function' ? onGranted : null;
    setSheetState({ mode: 'recovery', type });
  }, []);

  /**
   * 3-Layer Smart Permission Flow:
   * - granted -> runs immediately
   * - prompt -> opens Layer 1 Warm Ask sheet (tapping Not Now keeps OS permission untouched!)
   * - denied -> opens Layer 3 OS-aware Recovery Guide with live auto-resume
   */
  const ensurePermission = useCallback(
    async (type, { onGranted = null, customReason = '' } = {}) => {
      const current = await queryPermissionState(type);
      setStates((prev) => ({ ...prev, [type]: current }));

      if (current === 'granted') {
        if (type === 'notifications' && user) {
          subscribeToWebPush().catch(() => {});
        }
        if (typeof onGranted === 'function') onGranted();
        return 'granted';
      }

      if (current === 'unsupported') {
        return 'unsupported';
      }

      return new Promise((resolve) => {
        pendingCallbackRef.current = typeof onGranted === 'function' ? onGranted : null;
        pendingResolveRef.current = resolve;

        if (current === 'denied') {
          setSheetState({ mode: 'recovery', type });
        } else {
          setSheetState({ mode: 'warm', type, customReason });
        }
      });
    },
    [user]
  );

  // Triggered when user clicks "Allow" inside Warm Ask sheet or "Turn On" inside App Permissions Center
  const handleConfirmRequest = useCallback(
    async (type, returnToCenter = false) => {
      const result = await requestRawPermission(type);
      const updated = await queryPermissionState(type);
      const finalState = result === 'granted' ? 'granted' : updated;
      setStates((prev) => ({ ...prev, [type]: finalState }));

      if (finalState === 'granted') {
        if (type === 'notifications' && user) {
          await subscribeToWebPush().catch(() => {});
        }
        if (!returnToCenter) {
          setSheetState(null);
          const cb = pendingCallbackRef.current;
          const resolver = pendingResolveRef.current;
          pendingCallbackRef.current = null;
          pendingResolveRef.current = null;
          if (resolver) resolver('granted');
          if (cb) cb();
        }
        return 'granted';
      }

      if (finalState === 'denied') {
        setSheetState({ mode: 'recovery', type });
        return 'denied';
      }

      if (!returnToCenter) {
        closeSheet();
      }
      return finalState;
    },
    [user, closeSheet]
  );

  const handleRecheckInRecovery = useCallback(
    async (type) => {
      const next = await queryPermissionState(type);
      setStates((prev) => ({ ...prev, [type]: next }));
      if (next === 'granted') {
        if (type === 'notifications' && user) {
          await subscribeToWebPush().catch(() => {});
        }
        setSheetState(null);
        const cb = pendingCallbackRef.current;
        const resolver = pendingResolveRef.current;
        pendingCallbackRef.current = null;
        pendingResolveRef.current = null;
        if (resolver) resolver('granted');
        if (cb) cb();
        return 'granted';
      }
      return next;
    },
    [user]
  );

  const value = useMemo(
    () => ({
      states,
      refreshAllStates,
      openPermissionsCenter,
      openRecoveryGuide,
      ensurePermission,
    }),
    [states, refreshAllStates, openPermissionsCenter, openRecoveryGuide, ensurePermission]
  );

  return (
    <PermissionContext.Provider value={value}>
      {children}
      <PermissionsSheet
        sheetState={sheetState}
        states={states}
        isAuthenticated={Boolean(user)}
        onClose={closeSheet}
        onConfirmRequest={handleConfirmRequest}
        onOpenRecovery={(type) => setSheetState({ mode: 'recovery', type })}
        onRecheck={handleRecheckInRecovery}
        onBackToCenter={() => setSheetState({ mode: 'center' })}
      />
    </PermissionContext.Provider>
  );
}

export const usePermissions = () => useContext(PermissionContext);
