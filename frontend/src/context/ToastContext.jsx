import React, { createContext, useContext, useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext({
  showToast: () => {},
});

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const dismissToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  const showToast = useCallback((text, type = 'info') => {
    if (!text) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ id: Date.now(), text, type });
    timerRef.current = setTimeout(() => {
      setToast(null);
    }, 3600);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Floating Overlay Toast (never pushes or shifts page layout) */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-[120] w-[calc(100%-2rem)] max-w-sm pointer-events-none"
        >
          <div
            className={`pointer-events-auto px-4 py-3 rounded-2xl border text-xs font-bold flex items-center gap-2.5 ${
              toast.type === 'error'
                ? 'bg-rose-950 text-white border-rose-800'
                : toast.type === 'success'
                ? 'bg-emerald-950 text-white border-emerald-800'
                : 'bg-slate-900 text-white border-slate-800'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-brand-400 shrink-0" />
            )}
            <span className="flex-1 leading-snug">{toast.text}</span>
            <button
              type="button"
              onClick={dismissToast}
              className="p-0.5 text-white/70 hover:text-white cursor-pointer shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
