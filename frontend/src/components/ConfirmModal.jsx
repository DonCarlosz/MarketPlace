import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger' | 'primary' | 'warning'
  icon: IconComponent = AlertTriangle,
  loading = false,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      iconBg: 'bg-rose-100 text-rose-600',
      confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200',
    },
    primary: {
      iconBg: 'bg-indigo-100 text-indigo-600',
      confirmBtn: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200',
    },
    warning: {
      iconBg: 'bg-amber-100 text-amber-700',
      confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200',
    },
  }[variant] || {
    iconBg: 'bg-rose-100 text-rose-600',
    confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop - Clicking anywhere outside dismisses */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in"
        onClick={() => {
          if (!loading) onClose();
        }}
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100 z-10 animate-in fade-in zoom-in-95 duration-150"
      >
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-5 right-5 p-1 text-slate-400 hover:text-slate-600 rounded-full transition hover:bg-slate-100"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${variantStyles.iconBg}`}
          >
            <IconComponent className="w-6 h-6" />
          </div>

          <div className="flex-1 min-w-0 pr-4">
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm ${variantStyles.confirmBtn}`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
