import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ModeProvider } from './context/ModeContext';
import { FavoritesProvider } from './context/FavoritesContext';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import AIAssistantDrawer from './components/AIAssistantDrawer';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import ListingDetailPage from './pages/ListingDetailPage';
import CreateListingPage from './pages/CreateListingPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import FavoritesPage from './pages/FavoritesPage';

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
 The marketplace page or listing you are looking for does not exist or may have been relocated.
 </p>
 <Link
 to="/market"
 className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition "
 >
 Explore Marketplace
 </Link>
 </div>
 </div>
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
 <Route path="/profile/:userId" element={<ProfilePage />} />
 <Route path="/usr/:userId" element={<ProfilePage />} />
 <Route path="/favorites" element={<FavoritesPage />} />
 <Route path="/login" element={<AuthRouteRedirect view="login" />} />
 <Route path="/register" element={<AuthRouteRedirect view="register" />} />
 <Route path="*" element={<NotFoundPage />} />
 </Routes>
 </div>
 {!isChatRoute && <Footer />}
 <BottomNav />
 <AIAssistantDrawer />
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
