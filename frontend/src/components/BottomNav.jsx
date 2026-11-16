import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Store, PlusCircle, MessageSquare, User } from 'lucide-react';

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

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
      <div className="grid grid-cols-4 h-16 max-w-md mx-auto items-center px-2">
        {/* 1. Marketplace Explore */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 transition ${
              isActive && location.pathname === '/' ? 'text-indigo-600 font-bold' : 'text-slate-500 font-medium'
            }`
          }
        >
          <Store className="w-5 h-5" />
          <span className="text-[10px]">Market</span>
        </NavLink>

        {/* 2. Post Listing (Highlighted) */}
        <NavLink
          to="/create"
          onClick={handlePostClick}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 transition ${
              isActive ? 'text-indigo-600 font-bold' : 'text-slate-500 font-medium'
            }`
          }
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 -mt-2">
            <PlusCircle className="w-5 h-5" />
          </div>
          <span className="text-[10px]">Post</span>
        </NavLink>

        {/* 3. Messages Inbox */}
        <NavLink
          to="/messages"
          onClick={(e) => {
            if (!user) {
              e.preventDefault();
              openAuthModal('login');
            }
          }}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 transition ${
              isActive ? 'text-indigo-600 font-bold' : 'text-slate-500 font-medium'
            }`
          }
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px]">Inbox</span>
        </NavLink>

        {/* 4. Profile */}
        <NavLink
          to="/profile"
          onClick={handleProfileClick}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 transition ${
              isActive ? 'text-indigo-600 font-bold' : 'text-slate-500 font-medium'
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
