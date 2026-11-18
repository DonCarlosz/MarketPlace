import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import ConfirmModal from './ConfirmModal';
import {
  Home,
  Store,
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
} from 'lucide-react';

export default function Navbar() {
  const { user, logout, openAuthModal } = useAuth();
  const { count: favoritesCount } = useFavorites();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isMarketRoute = location.pathname === '/market';

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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
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

            {/* Desktop Saved Favorites Icon Link */}
            <Link
              to="/favorites"
              className="p-2 text-slate-600 hover:text-rose-600 hover:bg-slate-100 rounded-xl transition relative shrink-0"
              title="Saved Favorites"
            >
              <Heart className="w-5 h-5" />
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
                          className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-semibold"
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

          {/* Tablet & Mobile Header Action (< lg: 640px to 1023px and < 640px) */}
          <div className="flex lg:hidden items-center gap-2.5">
            {/* Quick avatar link if user is logged in */}
            {user && (
              <Link
                to="/profile"
                className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-200 shrink-0"
                title={user.name}
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  user.name?.charAt(0).toUpperCase() || 'U'
                )}
              </Link>
            )}

            {/* Hamburger Menu Button - Styled matching user's design */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="w-10 h-10 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition shadow-xs focus:outline-none cursor-pointer"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5 stroke-[2.2]" />
            </button>
          </div>
        </div>
      </div>

      {/* Responsive Slide-Over Navigation Drawer for Tablet & Mobile (< lg) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity animate-in fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer container */}
          <div className="fixed top-0 right-0 bottom-0 w-84 max-w-[88vw] bg-white z-50 shadow-2xl flex flex-col justify-between p-5 sm:p-6 animate-in slide-in-from-right duration-200 overflow-y-auto">
            {/* Top: Header & Profile Summary */}
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
                    <Store className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-lg text-slate-900">LocalMarket</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                  aria-label="Close Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User profile card or guest banner */}
              {user ? (
                <div className="flex items-center gap-3 p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
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
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">Verified Member</p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <p className="text-xs font-bold text-slate-800">Welcome to LocalMarket</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Trade second-hand goods, verified items, and hire local skills with zero commission.
                  </p>
                </div>
              )}

              {/* Navigation Links: The 5 core nav routes + Favorites */}
              <nav className="space-y-1.5 pt-1">
                {/* 1. Home */}
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition ${
                    location.pathname === '/'
                      ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 shadow-xs'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Home className={`w-5 h-5 ${location.pathname === '/' ? 'text-indigo-600' : 'text-slate-500'}`} />
                  <span>Home</span>
                </Link>

                {/* 2. Marketplace */}
                <Link
                  to="/market"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition ${
                    isMarketRoute
                      ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 shadow-xs'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <Store className={`w-5 h-5 ${isMarketRoute ? 'text-indigo-600' : 'text-slate-500'}`} />
                    <span>Explore Marketplace</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    Browse
                  </span>
                </Link>

                {/* 3. Post a Listing (Highlighted Action) */}
                <div className="pt-1 pb-1">
                  <Link
                    to="/create"
                    onClick={(e) => {
                      handleDrawerAction(() => {
                        if (!user) openAuthModal('login');
                        else navigate('/create');
                      });
                    }}
                    className="flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-200/80 hover:shadow-lg transition"
                  >
                    <div className="flex items-center gap-3">
                      <PlusCircle className="w-5 h-5 stroke-[2.2]" />
                      <span>Post a Listing</span>
                    </div>
                    <span className="text-[11px] font-semibold bg-white/20 px-2 py-0.5 rounded-full">
                      Free
                    </span>
                  </Link>
                </div>

                {/* 4. Messages & Chat */}
                <Link
                  to="/messages"
                  onClick={(e) => {
                    handleDrawerAction(() => {
                      if (!user) openAuthModal('login');
                      else navigate('/messages');
                    });
                  }}
                  className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition ${
                    location.pathname.startsWith('/messages')
                      ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <MessageSquare className="w-5 h-5 text-slate-500" />
                  <span>Messages & Chat</span>
                </Link>

                {/* 5. Saved Favorites */}
                <Link
                  to="/favorites"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition ${
                    location.pathname === '/favorites'
                      ? 'bg-rose-50 text-rose-700 font-bold border border-rose-100'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <Heart className="w-5 h-5 text-rose-500" />
                    <span>Saved Favorites</span>
                  </div>
                  {favoritesCount > 0 && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                      {favoritesCount}
                    </span>
                  )}
                </Link>

                {/* 6. Profile & My Listings */}
                <Link
                  to="/profile"
                  onClick={(e) => {
                    handleDrawerAction(() => {
                      if (!user) openAuthModal('login');
                      else navigate('/profile');
                    });
                  }}
                  className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition ${
                    location.pathname.startsWith('/profile')
                      ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <UserIcon className="w-5 h-5 text-slate-500" />
                  <span>{user ? 'My Profile & Listings' : 'Profile & Account'}</span>
                </Link>
              </nav>
            </div>

            {/* Bottom: Auth Actions (Arranged in a clean, perfect manner) */}
            <div className="pt-5 border-t border-slate-100">
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowLogoutConfirm(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition border border-rose-100 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        openAuthModal('login');
                      }}
                      className="flex items-center justify-center gap-2 px-3 py-3 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition shadow-xs cursor-pointer"
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
                      className="flex items-center justify-center gap-2 px-3 py-3 rounded-2xl text-xs sm:text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition shadow-xs cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Sign Up</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 text-center tracking-tight">
                    Instant verification • Zero platform transaction fees
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
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
