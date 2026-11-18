import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import ConfirmModal from './ConfirmModal';
import {
  Store,
  Home,
  PlusCircle,
  MessageSquare,
  User as UserIcon,
  LogOut,
  Compass,
  Heart,
  Menu,
  X,
  LogIn,
  UserPlus,
  ShieldCheck,
} from 'lucide-react';

export default function Navbar() {
  const { user, logout, openAuthModal } = useAuth();
  const { count: favoritesCount } = useFavorites();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isHomeRoute = location.pathname === '/';
  const isMarketRoute = location.pathname === '/market';
  const isMessagesRoute = location.pathname.startsWith('/messages');
  const isFavoritesRoute = location.pathname === '/favorites';
  const isProfileRoute = location.pathname.startsWith('/profile');

  const handleLogout = async () => {
    await logout();
    setShowLogoutConfirm(false);
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    navigate('/');
  };

  const handlePostListingClick = (e) => {
    if (!user) {
      e.preventDefault();
      openAuthModal('login');
    }
  };

  const handleDrawerAction = (action) => {
    setMobileMenuOpen(false);
    action();
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 w-full max-w-full overflow-hidden select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-sm shadow-indigo-200 group-hover:scale-105 transition">
                <Store className="w-5 h-5" />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-900 group-hover:text-indigo-600 transition">
                LocalMarket
              </span>
            </Link>
          </div>

          {/* Desktop Center Area: Explore Market Nav Button (Visible ONLY on desktop lg+) */}
          <div className="hidden lg:flex items-center justify-center">
            <Link
              to="/market"
              className={`inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold px-3.5 py-1.5 rounded-xl transition shadow-sm border ${
                isMarketRoute
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-slate-50 text-slate-700 hover:text-indigo-600 hover:bg-slate-100 border-slate-200/80'
              }`}
            >
              <Compass className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Explore Market</span>
            </Link>
          </div>

          {/* Desktop Right Action Buttons (Visible ONLY on desktop lg+) */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <Link
              to="/create"
              onClick={handlePostListingClick}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-100 hover:shadow-md transition whitespace-nowrap shrink-0"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Post Listing</span>
            </Link>

            <Link
              to="/favorites"
              className="p-2 text-slate-600 hover:text-rose-500 hover:bg-slate-100 rounded-xl transition relative shrink-0"
              title="Saved Favorites"
            >
              <Heart className="w-5 h-5 text-rose-500" />
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {favoritesCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to="/messages"
                  className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition relative shrink-0"
                  title="Messages"
                >
                  <MessageSquare className="w-5 h-5" />
                </Link>

                {/* User Dropdown */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center p-0.5 rounded-full hover:ring-2 hover:ring-indigo-300 transition"
                    title={user.name}
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-200 shadow-sm">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        user.name?.charAt(0).toUpperCase() || 'U'
                      )}
                    </div>
                  </button>

                  {dropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setDropdownOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-1">
                        <div className="px-4 py-2 border-b border-slate-100">
                          <p className="text-[11px] text-slate-400">Signed in as</p>
                          <p className="text-xs font-bold text-slate-800 truncate">{user.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                        </div>
                        <Link
                          to="/profile"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                        >
                          <UserIcon className="w-4 h-4 text-slate-400" />
                          My Profile & Listings
                        </Link>
                        <Link
                          to="/favorites"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                        >
                          <Heart className="w-4 h-4 text-rose-500" />
                          Saved Favorites
                        </Link>
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            setShowLogoutConfirm(true);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-semibold cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-rose-500" />
                          Log Out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 transition whitespace-nowrap cursor-pointer"
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal('register')}
                  className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition whitespace-nowrap cursor-pointer"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>

          {/* Tablet Action: Saved Favorites & Hamburger Menu (No profile avatar here - accessible inside drawer) */}
          <div className="hidden sm:flex lg:hidden items-center gap-2">
            <Link
              to="/favorites"
              className="p-2 text-slate-700 hover:text-rose-500 rounded-xl transition relative flex items-center justify-center"
              title="Saved Favorites"
              aria-label="Saved Favorites"
            >
              <Heart className="w-5 h-5 text-rose-500" />
              {favoritesCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                  {favoritesCount}
                </span>
              )}
            </Link>

            {/* Hamburger Menu Button for Tablet */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200 transition focus:outline-none cursor-pointer"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Top Header: Saved Favorites & Guest Auth (No profile avatar - accessible in bottom nav) */}
          <div className="flex sm:hidden items-center gap-1.5">
            <Link
              to="/favorites"
              className="p-2 text-slate-700 hover:text-rose-500 rounded-xl transition relative flex items-center justify-center"
              aria-label="Saved Favorites"
              title="Saved Favorites"
            >
              <Heart className="w-5 h-5 text-rose-500" />
              {favoritesCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                  {favoritesCount}
                </span>
              )}
            </Link>

            {!user && (
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition whitespace-nowrap cursor-pointer"
              >
                Log In
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Slide-Over Navigation Drawer for Tablet (Rendered via Portal at document.body with z-[99999] - Pinterest Minimalist Style) */}
      {mobileMenuOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[99999]">
            {/* Backdrop overlay */}
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Drawer container: full screen height, slides from right */}
            <div className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white z-[100000] shadow-2xl flex flex-col justify-between p-6 animate-in slide-in-from-right duration-200 overflow-y-auto">
              {/* Top: Icon-only header & Clean Routes */}
              <div className="space-y-4">
                {/* Header: Store Icon on left, Close button on right (No text) */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
                    <Store className="w-5 h-5" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                    aria-label="Close Menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Nav Routes: Pinterest minimalist style */}
                <nav className="space-y-1.5 pt-1">
                  {/* 1. Home */}
                  <Link
                    to="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[15px] transition ${
                      isHomeRoute
                        ? 'bg-slate-100 text-slate-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-50 font-semibold'
                    }`}
                  >
                    <Home className="w-5 h-5 text-indigo-600 shrink-0" />
                    <span>Home</span>
                  </Link>

                  {/* 2. Explore Marketplace */}
                  <Link
                    to="/market"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[15px] transition ${
                      isMarketRoute
                        ? 'bg-slate-100 text-slate-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-50 font-semibold'
                    }`}
                  >
                    <Store className="w-5 h-5 text-indigo-600 shrink-0" />
                    <span>Explore Marketplace</span>
                  </Link>

                  {/* 3. Post a Listing */}
                  <Link
                    to="/create"
                    onClick={() => {
                      handleDrawerAction(() => {
                        if (!user) openAuthModal('login');
                        else navigate('/create');
                      });
                    }}
                    className="flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[15px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-100 transition"
                  >
                    <PlusCircle className="w-5 h-5 shrink-0" />
                    <span>Post a Listing</span>
                  </Link>

                  {/* 4. Messages & Inbox */}
                  <Link
                    to="/messages"
                    onClick={() => {
                      handleDrawerAction(() => {
                        if (!user) openAuthModal('login');
                        else navigate('/messages');
                      });
                    }}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[15px] transition ${
                      isMessagesRoute
                        ? 'bg-slate-100 text-slate-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-50 font-semibold'
                    }`}
                  >
                    <MessageSquare className="w-5 h-5 text-slate-500 shrink-0" />
                    <span>Inbox & Messages</span>
                  </Link>

                  {/* 5. Saved Favorites */}
                  <Link
                    to="/favorites"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-4 py-3 rounded-2xl text-[15px] transition ${
                      isFavoritesRoute
                        ? 'bg-slate-100 text-slate-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-50 font-semibold'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <Heart className="w-5 h-5 text-rose-500 shrink-0" />
                      <span>Saved Favorites</span>
                    </div>
                    {favoritesCount > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center">
                        {favoritesCount}
                      </span>
                    )}
                  </Link>

                  {/* 6. Profile (if logged in) */}
                  {user && (
                    <Link
                      to="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[15px] transition ${
                        isProfileRoute
                          ? 'bg-slate-100 text-slate-900 font-bold'
                          : 'text-slate-700 hover:bg-slate-50 font-semibold'
                      }`}
                    >
                      <UserIcon className="w-5 h-5 text-slate-500 shrink-0" />
                      <span>My Profile & Listings</span>
                    </Link>
                  )}
                </nav>
              </div>

              {/* Bottom: Minimalist Auth Actions */}
              <div className="pt-4 border-t border-slate-100">
                {user ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setShowLogoutConfirm(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        openAuthModal('login');
                      }}
                      className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl text-sm font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                    >
                      <LogIn className="w-4 h-4 text-slate-600" />
                      <span>Log In</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        openAuthModal('register');
                      }}
                      className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Sign Up</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Log Out of LocalMarket?"
        message="Are you sure you want to end your current session? You will need your password to log back in."
        confirmText="Log Out"
        variant="danger"
        icon={LogOut}
      />
    </header>
  );
}
