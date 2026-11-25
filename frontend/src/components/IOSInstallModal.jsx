import React from 'react';
import { Share, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../context/PWAInstallContext';
import BrandLogo from './BrandLogo';

export default function IOSInstallModal() {
  const { showIOSPrompt, setShowIOSPrompt } = usePWAInstall();

  if (!showIOSPrompt) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/50"
      onClick={() => setShowIOSPrompt(false)}
    >
      <div
        className="w-full max-w-sm bg-white rounded-3xl border border-slate-200 p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <BrandLogo variant="badge" size="sm" showWordmark={false} />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Install oBuy</h3>
              <p className="text-[11px] text-slate-500">Add to your Home Screen</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowIOSPrompt(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Install oBuy on your device for fast access, zero address bar distractions, and smooth mobile browsing:
        </p>

        <div className="space-y-2.5 text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
              <Share className="w-4 h-4" />
            </div>
            <span>
              1. Tap the <strong>Share</strong> button in your browser toolbar.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
              <PlusSquare className="w-4 h-4" />
            </div>
            <span>
              2. Scroll down and tap <strong>Add to Home Screen</strong>.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowIOSPrompt(false)}
          className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer"
        >
          Got It
        </button>
      </div>
    </div>
  );
}
