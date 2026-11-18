import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ModeProvider } from './context/ModeContext';
import { FavoritesProvider } from './context/FavoritesContext';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import AuthModal from './components/AuthModal';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import ListingDetailPage from './pages/ListingDetailPage';
import CreateListingPage from './pages/CreateListingPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import FavoritesPage from './pages/FavoritesPage';
import { Store, ShieldCheck } from 'lucide-react';

function AuthRouteRedirect({ view }) {
  const { openAuthModal } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    openAuthModal(view);
    navigate('/', { replace: true });
  }, [view, openAuthModal, navigate]);

  return null;
}

function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto pt-12 pb-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-500 mb-16 sm:mb-0">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Column 1: Buy */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-xs tracking-wider uppercase">Buy & Discover</h4>
            <ul className="space-y-2 text-slate-600">
              <li>
                <Link to="/market" className="hover:text-indigo-600 transition">
                  Explore Marketplace
                </Link>
              </li>
              <li>
                <Link to="/market" className="hover:text-indigo-600 transition">
                  Second-Hand Goods
                </Link>
              </li>
              <li>
                <Link to="/market" className="hover:text-indigo-600 transition">
                  Brand-New Items
                </Link>
              </li>
              <li>
                <Link to="/market" className="hover:text-indigo-600 transition">
                  Local Handwork & Services
                </Link>
              </li>
              <li>
                <Link to="/favorites" className="hover:text-indigo-600 transition">
                  Saved Wishlist
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Sell */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-xs tracking-wider uppercase">Sell & Offer Handwork</h4>
            <ul className="space-y-2 text-slate-600">
              <li>
                <Link to="/create" className="hover:text-indigo-600 transition">
                  Post a Free Listing
                </Link>
              </li>
              <li>
                <span className="text-slate-500">Zero Commission / No Fees</span>
              </li>
              <li>
                <span className="text-slate-500">Fast In-App Buyer Chat</span>
              </li>
              <li>
                <span className="text-slate-500">Direct In-Person Payment</span>
              </li>
            </ul>
          </div>

          {/* Column 3: Safe Meetups & Trust */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-xs tracking-wider uppercase">Safe Community Trading</h4>
            <ul className="space-y-2 text-slate-600">
              <li>
                <span className="text-slate-500">Public Place Meetup Advice</span>
              </li>
              <li>
                <span className="text-slate-500">In-Person Inspection First</span>
              </li>
              <li>
                <span className="text-slate-500">No Wire Transfer Policy</span>
              </li>
              <li>
                <span className="text-slate-500">Discreet User Blocking & Spam Defense</span>
              </li>
            </ul>
          </div>

          {/* Column 4: About & Liability */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-xs tracking-wider uppercase">About LocalMarket</h4>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              Direct peer-to-peer neighborhood marketplace for pre-loved items, verified brand-new merchandise, and on-demand local skills across Nigeria.
            </p>
            <div className="pt-1 flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Zero Platform Payment Liability</span>
            </div>
          </div>
        </div>

        {/* Bottom copyright row */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 text-[11px]">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="font-bold text-slate-800">LocalMarket</span>
            <span>• Peer-to-Peer Second-Hand, New Items & Local Services</span>
          </div>
          <div className="flex items-center gap-4">
            <span>© {new Date().getFullYear()} LocalMarket Inc. All rights reserved.</span>
            <span className="text-slate-600 font-medium">Nigeria (NGN ₦)</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function AppContent() {
  const location = useLocation();
  const isChatRoute = location.pathname.startsWith('/messages');

  return (
    <div
      className={`flex flex-col bg-slate-50 text-slate-900 font-sans w-full max-w-full overflow-x-hidden ${
        isChatRoute
          ? 'h-screen max-h-screen overflow-hidden pb-16 sm:pb-0'
          : 'min-h-screen pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] sm:pb-0'
      }`}
    >
      <Navbar />
      <AuthModal />
      <div className={`flex-1 ${isChatRoute ? 'overflow-hidden flex flex-col' : ''}`}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/market" element={<HomePage />} />
          <Route path="/listing/:id" element={<ListingDetailPage />} />
          <Route path="/create" element={<CreateListingPage />} />
          <Route path="/messages" element={<ChatPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/login" element={<AuthRouteRedirect view="login" />} />
          <Route path="/register" element={<AuthRouteRedirect view="register" />} />
        </Routes>
      </div>
      {!isChatRoute && <Footer />}
      <BottomNav />
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
          <Router>
            <ScrollToTop />
            <AppContent />
          </Router>
        </FavoritesProvider>
      </ModeProvider>
    </AuthProvider>
  );
}
