import React from 'react';
import { Share, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../context/PWAInstallContext';
import BrandLogo from './BrandLogo';
import ResponsiveSheet from './ResponsiveSheet';

export default function IOSInstallModal() {
  const { showIOSPrompt, setShowIOSPrompt } = usePWAInstall();

  return (
    <ResponsiveSheet
      open={Boolean(showIOSPrompt)}
      onClose={() => setShowIOSPrompt(false)}
      title="Install oBuy"
      description="Add oBuy to your Home Screen"
      maxWidth="max-w-sm"
      showDefaultHeader={false}
      bodyClassName="px-5 pt-2 pb-6 sm:p-6 space-y-4"
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
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
          aria-label="Close install instructions"
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
          <div className="w-7 h-7 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0 border border-brand-100">
            <Share className="w-4 h-4" />
          </div>
          <span>
            1. Tap the <strong>Share</strong> button in your browser toolbar.
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0 border border-brand-100">
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
        className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white text-xs font-bold transition cursor-pointer"
      >
        Got It
      </button>
    </ResponsiveSheet>
  );
}
