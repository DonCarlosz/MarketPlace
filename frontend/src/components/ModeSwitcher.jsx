import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMode } from '../context/ModeContext';
import { RefreshCw, Sparkles, Wrench } from 'lucide-react';

const MODES = [
  {
    id: 'second-hand',
    label: 'Second-hand',
    icon: RefreshCw,
    activeBg: 'bg-indigo-600 text-white',
  },
  {
    id: 'new',
    label: 'New Items',
    icon: Sparkles,
    activeBg: 'bg-emerald-600 text-white',
  },
  {
    id: 'service',
    label: 'Services',
    icon: Wrench,
    activeBg: 'bg-purple-600 text-white',
  },
];

export default function ModeSwitcher({ compact = false }) {
  const { mode, setMode } = useMode();
  const navigate = useNavigate();
  const location = useLocation();

  const handleModeClick = (modeId) => {
    setMode(modeId);
    if (location.pathname !== '/market') {
      navigate('/market');
    }
  };

  return (
    <div
      className={`inline-flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200/80 ${
        compact ? 'gap-1' : 'gap-1.5'
      }`}
    >
      {MODES.map((m) => {
        const Icon = m.icon;
        const isActive = mode === m.id;

        return (
          <button
            key={m.id}
            type="button"
            onClick={() => handleModeClick(m.id)}
            className={`flex items-center gap-1.5 sm:gap-2 rounded-xl transition-colors font-semibold text-xs sm:text-sm select-none cursor-pointer ${
              compact ? 'px-2.5 sm:px-3 py-1.5' : 'px-3 sm:px-4 py-2'
            } ${
              isActive
                ? m.activeBg
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? '' : 'text-slate-400'}`} />
            <span>{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
