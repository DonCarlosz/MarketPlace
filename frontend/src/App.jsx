import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ModeProvider } from './context/ModeContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { PWAInstallProvider } from './context/PWAInstallContext';
import { ToastProvider } from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';
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

function PageLoader() {
  return (
    <div className="min-h-[55vh] flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-indigo-600 animate-spin" />
        <span className="text-xs font-semibold">Loading oBuy...</span>
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
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-2xl font-black">
          404
        </div>
        <h2 className="text-xl font-black text-slate-900">Page Not Found</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          The oBuy page or listing you are looking for does not exist or may have been relocated.
        </p>
        <Link
          to="/market"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition"
        >
          Explore oBuy
        </Link>
      </div>
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  const isChatRoute = location.pathname.startsWith('/messages');

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

  return (
    <div
      className={`flex flex-col bg-slate-50 text-slate-900 font-sans w-full max-w-full overflow-x-clip ${
        isChatRoute
          ? 'h-[100dvh] max-h-[100dvh] overflow-hidden pb-[calc(4rem+env(safe-area-inset-bottom,0px))] sm:pb-0'
          : 'min-h-[100dvh] pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] sm:pb-0'
      }`}
    >
      <Navbar />
      <AuthModal />
      <div className={`flex-1 ${isChatRoute ? 'overflow-hidden flex flex-col min-h-0' : ''}`}>
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
      </div>
      {!isChatRoute && <Footer />}
      <BottomNav />
      <AIAssistantDrawer />
      <IOSInstallModal />
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname !== '/market') {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <ModeProvider>
        <FavoritesProvider>
          <PWAInstallProvider>
            <ToastProvider>
              <Router>
                <NotificationProvider>
                  <ScrollToTop />
                  <AppContent />
                </NotificationProvider>
              </Router>
            </ToastProvider>
          </PWAInstallProvider>
        </FavoritesProvider>
      </ModeProvider>
    </AuthProvider>
  );
}
