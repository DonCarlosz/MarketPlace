import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, Store, Plus, MessageSquare, User } from 'lucide-react';

export default function BottomNav() {
  const { user, openAuthModal } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handlePostClick = (e) => {
    if (!user) {
      e.preventDefault();
      openAuthModal('login');
    }
  };

  const handleProfileClick = (e) => {
    if (!user) {
      e.preventDefault();
      openAuthModal('login');
    }
  };

  const handleInboxClick = (e) => {
    if (!user) {
      e.preventDefault();
      openAuthModal('login');
    }
  };

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      <div className="relative grid grid-cols-5 h-16 max-w-md mx-auto items-center px-1">
        {/* 1. Home (Landing Page) */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 transition ${
              isActive && location.pathname === '/'
                ? 'text-indigo-600 font-bold'
                : 'text-slate-500 font-medium hover:text-slate-900'
            }`
          }
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">Home</span>
        </NavLink>

        {/* 2. Market (Active Marketplace Feed & Radius Filter) */}
        <NavLink
          to="/market"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 transition ${
              isActive || location.pathname === '/market'
                ? 'text-indigo-600 font-bold'
                : 'text-slate-500 font-medium hover:text-slate-900'
            }`
          }
        >
          <Store className="w-5 h-5" />
          <span className="text-[10px]">Market</span>
        </NavLink>

        {/* 3. Center Elevated Dome Button (+) */}
        <div className="relative flex flex-col items-center justify-center -mt-6">
          {/* Pinterest-style smooth dome background notch protruding upwards */}
          <div className="absolute -top-1 w-16 h-8 bg-white/95 rounded-t-full border-t border-l border-r border-slate-200/90 pointer-events-none shadow-[0_-3px_8px_rgba(0,0,0,0.04)]" />

          {/* Elevated Circular + Button */}
          <NavLink
            to="/create"
            onClick={handlePostClick}
            className="relative z-10 w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-300/80 border-2 border-white active:scale-90 transition-transform duration-150 -mt-2"
            title="Post a Listing"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </NavLink>
          <span className="text-[10px] font-bold text-slate-700 mt-0.5">Post</span>
        </div>

        {/* 4. Messages Inbox */}
        <NavLink
          to="/messages"
          onClick={handleInboxClick}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 transition ${
              isActive || location.pathname.startsWith('/messages')
                ? 'text-indigo-600 font-bold'
                : 'text-slate-500 font-medium hover:text-slate-900'
            }`
          }
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px]">Inbox</span>
        </NavLink>

        {/* 5. Profile */}
        <NavLink
          to="/profile"
          onClick={handleProfileClick}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 transition ${
              isActive || location.pathname.startsWith('/profile')
                ? 'text-indigo-600 font-bold'
                : 'text-slate-500 font-medium hover:text-slate-900'
            }`
          }
        >
          <User className="w-5 h-5" />
          <span className="text-[10px]">{user ? 'Profile' : 'Log In'}</span>
        </NavLink>
      </div>
    </nav>
  );
}
