import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, Store, Plus, MessageSquare, User } from 'lucide-react';

export default function BottomNav() {
  const { user, openAuthModal } = useAuth();
  const location = useLocation();

  const requireAuth = (e) => {
    if (!user) {
      e.preventDefault();
      openAuthModal('login');
    }
  };

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 select-none mobile-fixed-bottom"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      aria-label="Mobile Navigation"
    >
      <div className="relative grid grid-cols-5 h-16 w-full max-w-lg mx-auto items-center px-1">
        {/* 1. Home */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 transition-colors ${
              isActive && location.pathname === '/'
                ? 'text-indigo-600 font-bold'
                : 'text-slate-500 font-medium hover:text-slate-900'
            }`
          }
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">Home</span>
        </NavLink>

        {/* 2. Market */}
        <NavLink
          to="/market"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 transition-colors ${
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
          <div className="absolute -top-1 w-16 h-8 bg-white rounded-t-full border-t border-l border-r border-slate-200 pointer-events-none" />
          <NavLink
            to="/create"
            onClick={requireAuth}
            className="relative z-10 w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center border-2 border-white active:scale-95 transition-transform -mt-2"
            title="Post a Listing"
            aria-label="Post a Listing"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </NavLink>
          <span className="text-[10px] font-bold text-slate-700 mt-0.5">Post</span>
        </div>

        {/* 4. Messages Inbox */}
        <NavLink
          to="/messages"
          onClick={requireAuth}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 transition-colors ${
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
          onClick={requireAuth}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 transition-colors ${
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
