import React, { useState } from 'react';
import { ShieldAlert, X, ChevronRight } from 'lucide-react';

export default function SafetyBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-amber-50/90 border-b border-amber-200/80 px-3 sm:px-4 py-1.5 text-amber-900 select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Desktop Badge */}
          <span className="hidden sm:inline-flex items-center gap-1 shrink-0 font-bold text-amber-900 bg-amber-200/70 px-2.5 py-0.5 rounded-full text-[11px]">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
            Zero-Liability & Safe Meetup Policy
          </span>

          {/* Mobile Badge */}
          <span className="sm:hidden inline-flex items-center gap-1 shrink-0 font-bold text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded-full text-[10px]">
            <ShieldAlert className="w-3 h-3 text-amber-700" />
            Safe Meetups
          </span>

          {/* Desktop Message */}
          <p className="hidden md:block text-amber-900 text-[11.5px] font-medium tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
            • All deals are off-platform. Meet in public well-lit places (cafés, malls, police stations). • Never transfer money before inspecting items or agreeing on service scope in person.
          </p>

          {/* Tablet & Mobile Message */}
          <p className="md:hidden text-amber-900 text-[10.5px] font-medium tracking-tight truncate">
            Meet in public places. Inspect items before paying.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 text-amber-700 hover:text-amber-950 hover:bg-amber-100 rounded-full transition shrink-0"
          title="Dismiss banner"
          aria-label="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
