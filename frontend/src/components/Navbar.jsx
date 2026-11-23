import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { usePWAInstall } from '../context/PWAInstallContext';
import { useNotifications } from '../context/NotificationContext';
import { resolveMediaUrl } from '../services/api';
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
  Download,
} from 'lucide-react';

export default function Navbar() {
  const { user, logout, openAuthModal } = useAuth();
  const { count: favoritesCount } = useFavorites();
  const { isInstalled, installApp } = usePWAInstall();
  const { unreadCount } = useNotifications();
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

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  // Close drawer on Escape key
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

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

  const userAvatarSrc = user?.avatar ? resolveMediaUrl(user.avatar) : '';

  return (
    <header
      className="sticky top-0 z-40 shrink-0 bg-white border-b border-slate-200 w-full max-w-full overflow-x-clip select-none"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                <Store className="w-5 h-5" />
              </div>
              <span className="font-black text-xl tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                oBuy
              </span>
            </Link>
          </div>

          {/* Desktop Center Area: Explore Market Nav Button (lg+) */}
          <div className="hidden lg:flex items-center justify-center">
            <Link
              to="/market"
              className={`inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold px-3.5 py-1.5 rounded-xl transition-colors border ${
                isMarketRoute
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-slate-50 text-slate-700 hover:text-indigo-600 hover:bg-slate-100 border-slate-200/80'
              }`}
            >
              <Compass className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Explore Market</span>
            </Link>
          </div>

          {/* Desktop Right Action Buttons (lg+) */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <Link
              to="/create"
              onClick={handlePostListingClick}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Post Listing</span>
            </Link>

            {!isInstalled && (
              <button
                type="button"
                onClick={installApp}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 transition-colors cursor-pointer shrink-0"
                title="Install oBuy as a standalone app"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>Install App</span>
              </button>
            )}

            {user ? (
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to="/messages"
                  className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors relative shrink-0"
                  title="Messages"
                >
                  <MessageSquare className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center leading-none border border-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* User Dropdown */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center p-0.5 rounded-full hover:ring-2 hover:ring-indigo-300 transition cursor-pointer"
                    title={user.name}
                    aria-label="Account menu"
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-200 overflow-hidden">
                      {userAvatarSrc ? (
                        <img
                          src={userAvatarSrc}
                          alt={user.name}
                          className="w-full h-full object-cover"
                          decoding="async"
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
                      <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl border border-slate-200 py-1.5 z-50">
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
                          type="button"
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
                  className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal('register')}
                  className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>

          {/* Mobile & Tablet Top Header (< lg): Clean top bar (mobile relies on BottomNav; tablet sm..lg keeps menu button) */}
          <div className="flex lg:hidden items-center gap-2">
            {!isInstalled && (
              <button
                type="button"
                onClick={installApp}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-colors whitespace-nowrap cursor-pointer"
                title="Install oBuy App"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>Install</span>
              </button>
            )}

            {!user && (
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-colors whitespace-nowrap cursor-pointer"
              >
                Log In
              </button>
            )}

            {/* Tablet-only Menu Button (sm..lg where BottomNav is hidden) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="hidden sm:flex p-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors focus:outline-none cursor-pointer"
              aria-label="Open Navigation Menu"
              title="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Slide-Over Navigation Drawer for Mobile & Tablet */}
      {mobileMenuOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[99999]">
            <div
              className="fixed inset-0 bg-slate-900/50 transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />

            <div className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white border-l border-slate-200 z-[100000] flex flex-col justify-between p-5 overflow-y-auto overscroll-contain">
              <div className="space-y-4">
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                      <Store className="w-5 h-5" />
                    </div>
                    <span className="font-black text-lg text-slate-900">oBuy</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                    aria-label="Close Menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Signed-in User Summary Card */}
                {user && (
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-indigo-300 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center border border-indigo-200 overflow-hidden shrink-0">
                      {userAvatarSrc ? (
                        <img
                          src={userAvatarSrc}
                          alt={user.name}
                          className="w-full h-full object-cover"
                          decoding="async"
                        />
                      ) : (
                        user.name?.charAt(0).toUpperCase() || 'U'
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    </div>
                  </Link>
                )}

                {/* Navigation Links */}
                <nav className="space-y-1">
                  <Link
                    to="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[15px] transition-colors ${
                      isHomeRoute
                        ? 'bg-slate-100 text-slate-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-50 font-semibold'
                    }`}
                  >
                    <Home className="w-5 h-5 text-indigo-600 shrink-0" />
                    <span>Home</span>
                  </Link>

                  <Link
                    to="/market"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[15px] transition-colors ${
                      isMarketRoute
                        ? 'bg-slate-100 text-slate-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-50 font-semibold'
                    }`}
                  >
                    <Store className="w-5 h-5 text-indigo-600 shrink-0" />
                    <span>Explore oBuy</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() =>
                      handleDrawerAction(() => {
                        if (!user) openAuthModal('login');
                        else navigate('/create');
                      })
                    }
                    className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[15px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer text-left"
                  >
                    <PlusCircle className="w-5 h-5 shrink-0" />
                    <span>Post a Listing</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleDrawerAction(() => {
                        if (!user) openAuthModal('login');
                        else navigate('/messages');
                      })
                    }
                    className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[15px] transition-colors cursor-pointer text-left ${
                      isMessagesRoute
                        ? 'bg-slate-100 text-slate-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-50 font-semibold'
                    }`}
                  >
                    <MessageSquare className="w-5 h-5 text-slate-500 shrink-0" />
                    <span>Inbox & Messages</span>
                  </button>

                  <Link
                    to="/favorites"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-4 py-3 rounded-2xl text-[15px] transition-colors ${
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

                  {user && (
                    <Link
                      to="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[15px] transition-colors ${
                        isProfileRoute
                          ? 'bg-slate-100 text-slate-900 font-bold'
                          : 'text-slate-700 hover:bg-slate-50 font-semibold'
                      }`}
                    >
                      <UserIcon className="w-5 h-5 text-slate-500 shrink-0" />
                      <span>My Profile & Listings</span>
                    </Link>
                  )}

                  {!isInstalled && (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        installApp();
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[15px] font-semibold text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-200/70 transition-colors cursor-pointer text-left mt-1"
                    >
                      <div className="flex items-center gap-3.5">
                        <Download className="w-5 h-5 text-indigo-600 shrink-0" />
                        <span>Install oBuy App</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                        App
                      </span>
                    </button>
                  )}
                </nav>
              </div>

              {/* Bottom Auth Actions */}
              <div className="pt-4 border-t border-slate-100">
                {user ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setShowLogoutConfirm(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 transition-colors cursor-pointer"
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
                      className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl text-sm font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
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
                      className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
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
        title="Log Out of oBuy?"
        message="Are you sure you want to end your current session? You will need your password to log back in."
        confirmText="Log Out"
        variant="danger"
        icon={LogOut}
      />
    </header>
  );
}
