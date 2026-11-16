import React, { useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';

export default function SafetyBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-amber-50 border-y border-amber-200/80 px-3 sm:px-4 py-1.5 text-amber-900">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
          <span className="inline-flex items-center gap-1 shrink-0 font-semibold text-amber-800 bg-amber-200/60 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px]">
            <ShieldAlert className="w-3.5 h-3.5" />
            Zero-Liability & Safe Meetup Policy
          </span>
          <p className="text-amber-800 text-[10.5px] lg:text-[11.5px] tracking-tight leading-normal whitespace-nowrap overflow-hidden text-ellipsis">
            <span>• All deals are off-platform. Meet in public well-lit places (cafés, malls, police stations). • Never transfer money before inspecting items or agreeing on service scope in person.</span>
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-amber-600 hover:text-amber-800 rounded transition shrink-0 ml-1"
          title="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
