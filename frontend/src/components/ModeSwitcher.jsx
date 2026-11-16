import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMode } from '../context/ModeContext';
import { RefreshCw, Sparkles, Wrench } from 'lucide-react';

const MODES = [
  {
    id: 'second-hand',
    label: 'Second-hand',
    icon: RefreshCw,
    activeBg: 'bg-indigo-600 text-white shadow-md shadow-indigo-100',
  },
  {
    id: 'new',
    label: 'New Items',
    icon: Sparkles,
    activeBg: 'bg-emerald-600 text-white shadow-md shadow-emerald-100',
  },
  {
    id: 'service',
    label: 'Services',
    icon: Wrench,
    activeBg: 'bg-purple-600 text-white shadow-md shadow-purple-100',
  },
];

export default function ModeSwitcher({ compact = false }) {
  const { mode, setMode } = useMode();
  const navigate = useNavigate();
  const location = useLocation();

  const handleModeClick = (modeId) => {
    setMode(modeId);
    // Navigate to marketplace feed if on another route
    if (location.pathname !== '/market') {
      navigate('/market');
    }
  };

  return (
    <div
      className={`inline-flex items-center p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 backdrop-blur-sm ${
        compact ? 'gap-1' : 'gap-1.5'
      }`}
    >
      {MODES.map((m) => {
        const Icon = m.icon;
        const isActive = mode === m.id;

        return (
          <button
            key={m.id}
            onClick={() => handleModeClick(m.id)}
            className={`flex items-center gap-1.5 sm:gap-2 rounded-xl transition-all font-semibold text-xs sm:text-sm select-none cursor-pointer ${
              compact ? 'px-2.5 sm:px-3 py-1.5' : 'px-3 sm:px-4 py-2'
            } ${
              isActive
                ? `${m.activeBg} scale-[1.01]`
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'rotate-0' : 'text-slate-400'}`} />
            <span>{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
