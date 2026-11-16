import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ModeProvider } from './context/ModeContext';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import AuthModal from './components/AuthModal';
import HomePage from './pages/HomePage';
import ListingDetailPage from './pages/ListingDetailPage';
import CreateListingPage from './pages/CreateListingPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
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
    <footer className="bg-white border-t border-slate-200 mt-auto py-8 px-4 text-xs text-slate-500 mb-16 sm:mb-0">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-indigo-600" />
          <span className="font-bold text-slate-800">LocalMarket</span>
          <span>— Peer-to-Peer Second-Hand, New Items & Local Services</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1 text-slate-600">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Zero Platform Payment Liability
          </span>
          <span>© {new Date().getFullYear()} LocalMarket.</span>
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
      className={`flex flex-col bg-slate-50 text-slate-900 font-sans ${
        isChatRoute ? 'h-screen max-h-screen overflow-hidden pb-16 sm:pb-0' : 'min-h-screen pb-16 sm:pb-0'
      }`}
    >
      <Navbar />
      <AuthModal />
      <div className={`flex-1 ${isChatRoute ? 'overflow-hidden flex flex-col' : ''}`}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/listing/:id" element={<ListingDetailPage />} />
          <Route path="/create" element={<CreateListingPage />} />
          <Route path="/messages" element={<ChatPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/login" element={<AuthRouteRedirect view="login" />} />
          <Route path="/register" element={<AuthRouteRedirect view="register" />} />
        </Routes>
      </div>
      {!isChatRoute && <Footer />}
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ModeProvider>
        <Router>
          <AppContent />
        </Router>
      </ModeProvider>
    </AuthProvider>
  );
}
