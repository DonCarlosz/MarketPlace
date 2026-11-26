import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import API, { resolveMediaUrl } from '../services/api';
import { getSocket } from '../services/socket';
import { useAuth } from './AuthContext';
import { usePermissions } from './PermissionContext';
import { syncAppBadge, subscribeToWebPush } from '../utils/permissions';
import { MessageSquare, Mic, Tag, MapPin, X } from 'lucide-react';

const NotificationContext = createContext({
  unreadCount: 0,
  pendingRequests: 0,
  refreshUnreadCount: () => {},
  setActiveConversationId: () => {},
  requestNotificationPermission: () => {},
});

// Synthesize a subtle WhatsApp-like two-tone chime via Web Audio API (zero external asset dependency)
const playNotificationChime = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playTone = (freq, startOffset, duration, gainPeak) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + startOffset);
      gain.gain.setValueAtTime(0.0001, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(gainPeak, now + startOffset + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration + 0.02);
    };

    playTone(880, 0, 0.11, 0.08);
    playTone(1174.66, 0.09, 0.14, 0.07);
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 450);
  } catch {
    // Ignore autoplay or Web Audio restrictions
  }
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const { ensurePermission } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [banner, setBanner] = useState(null);

  const activeConvIdRef = useRef(null);
  const pathnameRef = useRef(location.pathname);
  const bannerTimerRef = useRef(null);
  const userId = (user?._id || user?.id)?.toString() || null;

  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  const setActiveConversationId = useCallback((convId) => {
    activeConvIdRef.current = convId ? String(convId) : null;
  }, []);

  const dismissBanner = useCallback(() => {
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    setBanner(null);
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    if (!userId) {
      setUnreadCount(0);
      setPendingRequests(0);
      return;
    }
    try {
      const res = await API.get('/chat/unread-count');
      if (res.data?.success) {
        setUnreadCount(Number(res.data.totalUnread) || 0);
        setPendingRequests(Number(res.data.pendingRequests) || 0);
      }
    } catch {
      // Non-blocking background sync
    }
  }, [userId]);

  const requestNotificationPermission = useCallback(
    async ({ passive = true } = {}) => {
      if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';

      if (Notification.permission === 'granted') {
        if (userId) subscribeToWebPush().catch(() => {});
        return 'granted';
      }

      if (passive) {
        // Never nag repeatedly on passive chat clicks or when user already blocked in OS
        if (Notification.permission === 'denied') return 'denied';
        try {
          if (sessionStorage.getItem('obuy_notif_warm_prompted')) return 'prompt';
          sessionStorage.setItem('obuy_notif_warm_prompted', '1');
        } catch {
          // Ignore storage errors
        }
      }

      const result = await ensurePermission('notifications');
      if (result === 'granted' && userId) {
        subscribeToWebPush().catch(() => {});
      }
      return result;
    },
    [ensurePermission, userId]
  );

  // Sync live unread count to the home-screen PWA App Icon Badge (Android / iOS 16.4+ / Desktop)
  useEffect(() => {
    syncAppBadge(userId ? unreadCount : 0);
  }, [unreadCount, userId]);

  // Load unread counts & silently ensure W3C Web Push subscription when authenticated + permitted
  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      setPendingRequests(0);
      setBanner(null);
      syncAppBadge(0);
      return;
    }
    refreshUnreadCount();
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      subscribeToWebPush().catch(() => {});
    }
  }, [userId, refreshUnreadCount]);

  // Listen for real-time WhatsApp-style message & request notifications
  useEffect(() => {
    if (!userId) return;
    const socket = getSocket();

    const handleNewNotification = (payload) => {
      if (!payload || String(payload.senderId || '') === userId) return;

      const isOnMessages = pathnameRef.current.startsWith('/messages');
      const isViewingSameThread =
        isOnMessages &&
        activeConvIdRef.current &&
        String(activeConvIdRef.current) === String(payload.conversationId);

      // If actively viewing that exact thread in foreground, mark read silently and skip popup
      if (isViewingSameThread && !document.hidden) {
        return;
      }

      setUnreadCount((prev) => prev + 1);
      if (payload.isRequest) {
        setPendingRequests((prev) => prev + 1);
      }

      playNotificationChime();

      // Show sleek WhatsApp-style heads-up banner in-app
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
      setBanner(payload);
      bannerTimerRef.current = setTimeout(() => {
        setBanner(null);
      }, 5200);

      // Fire native OS / PWA system notification when backgrounded & permitted
      if (
        document.hidden &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        const title = payload.isRequest
          ? `New Message Request from ${payload.senderName || 'oBuy Member'}`
          : payload.senderName || 'New oBuy Message';
        const body = payload.preview || 'You received a new message on oBuy.';
        try {
          const notif = new Notification(title, {
            body,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            tag: `obuy-chat-${payload.conversationId}`,
          });
          notif.onclick = () => {
            window.focus();
            navigate(`/messages?conversationId=${payload.conversationId}`);
            notif.close();
          };
        } catch {
          // Fallback silently if Notification constructor is restricted in mobile SW context
        }
      }
    };

    socket.on('new_message_notification', handleNewNotification);
    return () => {
      socket.off('new_message_notification', handleNewNotification);
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  }, [userId, navigate]);

  const handleOpenBannerChat = () => {
    if (!banner?.conversationId) return;
    const targetId = banner.conversationId;
    dismissBanner();
    navigate(`/messages?conversationId=${targetId}`);
  };

  const renderPreviewIcon = (type) => {
    if (type === 'voice') return <Mic className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
    if (type === 'offer') return <Tag className="w-3.5 h-3.5 text-slate-500 shrink-0" />;
    if (type === 'meetup_proposal') return <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
    return <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
  };

  const value = useMemo(
    () => ({
      unreadCount,
      pendingRequests,
      refreshUnreadCount,
      setActiveConversationId,
      requestNotificationPermission,
    }),
    [unreadCount, pendingRequests, refreshUnreadCount, setActiveConversationId, requestNotificationPermission]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}

      {/* WhatsApp-Style Top Heads-Up Notification Banner */}
      {banner && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[130] w-[calc(100%-1.5rem)] max-w-md"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <div
            onClick={handleOpenBannerChat}
            className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
          >
            {/* Sender Avatar with Online/Incoming Dot */}
            <div className="relative shrink-0">
              <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-700 font-black text-sm flex items-center justify-center border border-slate-200 overflow-hidden">
                {banner.senderAvatar ? (
                  <img
                    src={resolveMediaUrl(banner.senderAvatar)}
                    alt={banner.senderName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  banner.senderName?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
            </div>

            {/* Notification Copy */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-slate-900 truncate">
                  {banner.senderName || 'oBuy Member'}
                </span>
                {banner.isRequest && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-extrabold uppercase tracking-wider shrink-0">
                    Request
                  </span>
                )}
                <span className="text-[10px] text-emerald-600 font-bold ml-auto shrink-0">now</span>
              </div>

              {banner.listingTitle && (
                <p className="text-[10px] font-semibold text-slate-600 truncate">
                  {banner.listingTitle}
                </p>
              )}

              <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-0.5">
                {renderPreviewIcon(banner.messageType)}
                <p className="truncate">{banner.preview || 'New message'}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                dismissBanner();
              }}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full shrink-0 cursor-pointer"
              aria-label="Dismiss message notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
