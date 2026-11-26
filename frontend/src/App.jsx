import React, { useEffect, useState, lazy, Suspense } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
  useNavigationType,
  Link,
} from 'react-router-dom';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ModeProvider } from './context/ModeContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { PWAInstallProvider } from './context/PWAInstallContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { PermissionProvider } from './context/PermissionContext';
import { NotificationProvider } from './context/NotificationContext';
import { routeScrollCache } from './utils/routeCache';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import AIAssistantDrawer from './components/AIAssistantDrawer';
import IOSInstallModal from './components/IOSInstallModal';

// Code-split route pages with background idle preloading for instant zero-flash tab switching
const loadLandingPage = () => import('./pages/LandingPage');
const loadHomePage = () => import('./pages/HomePage');
const loadListingDetailPage = () => import('./pages/ListingDetailPage');
const loadCreateListingPage = () => import('./pages/CreateListingPage');
const loadChatPage = () => import('./pages/ChatPage');
const loadProfilePage = () => import('./pages/ProfilePage');
const loadFavoritesPage = () => import('./pages/FavoritesPage');

const LandingPage = lazy(loadLandingPage);
const HomePage = lazy(loadHomePage);
const ListingDetailPage = lazy(loadListingDetailPage);
const CreateListingPage = lazy(loadCreateListingPage);
const ChatPage = lazy(loadChatPage);
const ProfilePage = lazy(loadProfilePage);
const FavoritesPage = lazy(loadFavoritesPage);

// Native Shimmer Skeleton Loader (replaces generic spinning wheel)
function PageLoader() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5 w-full">
      <div className="h-28 sm:h-40 rounded-2xl obuy-shimmer" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className="h-[296px] sm:h-[344px] rounded-2xl bg-white border border-slate-200 overflow-hidden flex flex-col"
          >
            <div className="h-[156px] sm:h-[188px] obuy-shimmer shrink-0" />
            <div className="p-3 space-y-2.5 flex-1">
              <div className="h-4 w-24 rounded-md obuy-shimmer" />
              <div className="h-3.5 w-full rounded-md obuy-shimmer" />
              <div className="h-3 w-2/3 rounded-md obuy-shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuthRouteRedirect({ view }) {
  const { openAuthModal } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    openAuthModal(view);
    navigate('/', { replace: true });
  }, [view, openAuthModal, navigate]);

  return null;
}

function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto text-2xl font-black">
          404
        </div>
        <h2 className="text-xl font-black text-slate-900">Page Not Found</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          The oBuy page or listing you are looking for does not exist or may have been relocated.
        </p>
        <Link
          to="/market"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition"
        >
          Explore oBuy
        </Link>
      </div>
    </div>
  );
}

// Routes that behave as persistent top-level tabs (instant zero-lag switch + scroll memory)
const TAB_ROUTES = new Set(['/', '/market', '/messages', '/profile', '/favorites']);

function isDetailStackRoute(pathname) {
  return (
    pathname.startsWith('/listing/') ||
    pathname.startsWith('/create') ||
    pathname.startsWith('/profile/') ||
    pathname.startsWith('/usr/')
  );
}

function ScrollManager() {
  const { pathname } = useLocation();
  const navType = useNavigationType();

  // Persist scroll position continuously for tab routes
  useEffect(() => {
    if (!TAB_ROUTES.has(pathname) || pathname === '/messages') return undefined;

    let rafId = null;
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        routeScrollCache.set(pathname, window.scrollY);
        rafId = null;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      routeScrollCache.set(pathname, window.scrollY);
      window.removeEventListener('scroll', onScroll);
    };
  }, [pathname]);

  // Restore saved tab scroll offset when returning, or snap to top on detail screens
  useEffect(() => {
    if (pathname === '/messages') {
      window.scrollTo(0, 0);
      return;
    }

    if (TAB_ROUTES.has(pathname) && routeScrollCache.has(pathname)) {
      const savedY = routeScrollCache.get(pathname) || 0;
      requestAnimationFrame(() => {
        window.scrollTo({ top: savedY, behavior: 'instant' });
      });
      return;
    }

    if (navType !== 'POP') {
      window.scrollTo(0, 0);
    }
  }, [pathname, navType]);

  return null;
}

function OfflineBanner() {
  const { showToast } = useToast();
  const [isOffline, setIsOffline] = useState(
    () => typeof navigator !== 'undefined' && navigator.onLine === false
  );

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      setIsOffline(false);
      showToast('Back online - syncing latest updates.', 'success');
      window.dispatchEvent(new CustomEvent('obuy:online'));
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [showToast]);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="w-full bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-center text-[11px] font-bold text-amber-900 flex items-center justify-center gap-1.5 shrink-0"
    >
      <WifiOff className="w-3.5 h-3.5 text-amber-700 shrink-0" />
      <span>Offline - showing saved data. Changes will sync when connection returns.</span>
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  const navType = useNavigationType();
  const isChatRoute = location.pathname.startsWith('/messages');
  const isDetailRoute = isDetailStackRoute(location.pathname);

  // Preload core tab chunks during idle time so switching routes never flashes a loader
  useEffect(() => {
    const preloadCoreRoutes = () => {
      loadLandingPage();
      loadHomePage();
      loadChatPage();
      loadProfilePage();
      loadListingDetailPage();
      loadCreateListingPage();
      loadFavoritesPage();
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(preloadCoreRoutes, { timeout: 1500 });
      return () => window.cancelIdleCallback(idleId);
    }
    const timer = setTimeout(preloadCoreRoutes, 600);
    return () => clearTimeout(timer);
  }, []);

  const routeElement = (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/market" element={<HomePage />} />
        <Route path="/listing/:id" element={<ListingDetailPage />} />
        <Route path="/create" element={<CreateListingPage />} />
        <Route path="/messages" element={<ChatPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/:userId" element={<ProfilePage />} />
        <Route path="/usr/:userId" element={<ProfilePage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/login" element={<AuthRouteRedirect view="login" />} />
        <Route path="/register" element={<AuthRouteRedirect view="register" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );

  return (
    <div
      className={`flex flex-col text-slate-900 font-sans w-full max-w-full overflow-x-clip ${
        isChatRoute
          ? 'fixed inset-0 bg-white overflow-hidden pb-[calc(4rem+env(safe-area-inset-bottom,0px))] sm:pb-0'
          : 'min-h-[100dvh] bg-slate-50 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] sm:pb-0'
      }`}
    >
      <Navbar />
      <OfflineBanner />
      <AuthModal />
      <div className={`flex-1 ${isChatRoute ? 'overflow-hidden flex flex-col min-h-0' : ''}`}>
        {isDetailRoute ? (
          <m.div
            key={location.pathname}
            initial={{ opacity: 0.45, x: navType === 'POP' ? -18 : 22 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
          >
            {routeElement}
          </m.div>
        ) : (
          routeElement
        )}
      </div>
      {!isChatRoute && <Footer />}
      <BottomNav />
      <AIAssistantDrawer />
      <IOSInstallModal />
    </div>
  );
}

export default function App() {
  return (
    <LazyMotion features={domAnimation}>
      <AuthProvider>
        <ModeProvider>
          <FavoritesProvider>
            <PWAInstallProvider>
              <ToastProvider>
                <Router>
                  <PermissionProvider>
                    <NotificationProvider>
                      <ScrollManager />
                      <AppContent />
                    </NotificationProvider>
                  </PermissionProvider>
                </Router>
              </ToastProvider>
            </PWAInstallProvider>
          </FavoritesProvider>
        </ModeProvider>
      </AuthProvider>
    </LazyMotion>
  );
}
