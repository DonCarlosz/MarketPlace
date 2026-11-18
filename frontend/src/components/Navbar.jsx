import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from './ConfirmModal';
import {
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

          {/* Tablet & Mobile Menu Toggle (< lg: 640px to 1023px and < 640px) */}
          <div className="flex lg:hidden items-center gap-2">
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

            {/* Hamburger Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200 transition focus:outline-none cursor-pointer"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
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
          <div className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white z-50 shadow-2xl flex flex-col justify-between p-6 animate-in slide-in-from-right duration-200 overflow-y-auto">
            {/* Top: Header & Profile Summary */}
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
                    <Store className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-lg text-slate-900">LocalMarket</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
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
                    Trade second-hand goods, shop new items, and hire local handwork with zero fees.
                  </p>
                </div>
              )}

              {/* Navigation Links */}
              <nav className="space-y-1.5 pt-2">
                <Link
                  to="/market"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                    isMarketRoute
                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Compass className="w-5 h-5 text-indigo-600" />
                  <span>Explore Marketplace</span>
                </Link>

                <Link
                  to="/create"
                  onClick={(e) => {
                    handleDrawerAction(() => {
                      if (!user) openAuthModal('login');
                      else navigate('/create');
                    });
                  }}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-100 transition"
                >
                  <PlusCircle className="w-5 h-5" />
                  <span>Post a Listing</span>
                </Link>

                <Link
                  to="/messages"
                  onClick={(e) => {
                    handleDrawerAction(() => {
                      if (!user) openAuthModal('login');
                      else navigate('/messages');
                    });
                  }}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  <MessageSquare className="w-5 h-5 text-slate-500" />
                  <span>Messages & Chat</span>
                </Link>

                <Link
                  to="/favorites"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  <Heart className="w-5 h-5 text-rose-500" />
                  <span>Saved Favorites</span>
                </Link>

                {user && (
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <UserIcon className="w-5 h-5 text-slate-500" />
                    <span>My Profile & Listings</span>
                  </Link>
                )}
              </nav>
            </div>

            {/* Bottom: Auth Actions */}
            <div className="pt-6 border-t border-slate-100 space-y-2">
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowLogoutConfirm(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openAuthModal('login');
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 border border-slate-200 hover:bg-slate-50 transition"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Log In</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openAuthModal('register');
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Sign Up</span>
                  </button>
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
