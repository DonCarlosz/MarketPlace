import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMode } from '../context/ModeContext';
import ModeSwitcher from './ModeSwitcher';
import ConfirmModal from './ConfirmModal';
import {
  Store,
  PlusCircle,
  MessageSquare,
  User as UserIcon,
  LogOut,
  MapPin,
  Compass,
} from 'lucide-react';

export default function Navbar() {
  const { user, logout, openAuthModal } = useAuth();
  const { userLocation } = useMode();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    setShowLogoutConfirm(false);
    setDropdownOpen(false);
    navigate('/');
  };

  const handlePostListingClick = (e) => {
    if (!user) {
      e.preventDefault();
      openAuthModal('login');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo & Explore Market Link */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-sm shadow-indigo-200 group-hover:scale-105 transition">
                <Store className="w-5 h-5" />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-900 group-hover:text-indigo-600 transition">
                LocalMarket
              </span>
            </Link>

            <Link
              to="/market"
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-indigo-600 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition"
            >
              <Compass className="w-3.5 h-3.5 text-indigo-600" />
              <span>Explore Market</span>
            </Link>

            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100/80 px-3 py-1 rounded-full border border-slate-200/80">
              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
              <span className="font-semibold">{userLocation.city || 'All Locations'}</span>
            </div>
          </div>

          {/* Mode Switcher in Center (visible on tablet and desktop) */}
          <div className="hidden sm:block">
            <ModeSwitcher compact />
          </div>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              to="/create"
              onClick={handlePostListingClick}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-100 hover:shadow-md transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Post Listing</span>
            </Link>

            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/messages"
                  className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition relative"
                  title="Messages"
                >
                  <MessageSquare className="w-5 h-5" />
                </Link>

                {/* User Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition"
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-200">
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
                    <span className="text-xs sm:text-sm font-semibold text-slate-700 max-w-[110px] truncate">
                      {user.name}
                    </span>
                  </button>

                  {dropdownOpen && (
                    <>
                      {/* Full-screen invisible dismiss backdrop so clicking ANY part of the screen closes it */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setDropdownOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-1">
                        <div className="px-4 py-2 border-b border-slate-100">
                          <p className="text-[11px] text-slate-400">Signed in as</p>
                          <p className="text-xs font-bold text-slate-800 truncate">{user.email}</p>
                        </div>
                        <Link
                          to="/profile"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                        >
                          <UserIcon className="w-4 h-4 text-slate-400" />
                          My Profile & Listings
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal('register')}
                  className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>

          {/* Mobile top header action: Sign in button or user avatar (clean and uncluttered) */}
          <div className="flex sm:hidden items-center gap-2">
            {user ? (
              <Link
                to="/profile"
                className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-200"
              >
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-600 text-white"
              >
                Log In
              </button>
            )}
          </div>
        </div>

        {/* Mobile secondary bar: Mode Switcher */}
        <div className="sm:hidden py-2 border-t border-slate-100 flex justify-center">
          <ModeSwitcher compact />
        </div>
      </div>

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
