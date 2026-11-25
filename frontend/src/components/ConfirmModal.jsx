import React from 'react';
import { AlertTriangle } from 'lucide-react';
import ResponsiveSheet from './ResponsiveSheet';
import { hapticWarning, hapticTap } from '../utils/haptics';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  icon: IconComponent = AlertTriangle,
  loading = false,
}) {
  const variantStyles = {
    danger: {
      iconBg: 'bg-rose-100 text-rose-600',
      confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white',
    },
    primary: {
      iconBg: 'bg-brand-100 text-brand-600',
      confirmBtn: 'bg-brand-600 hover:bg-brand-700 text-white',
    },
    warning: {
      iconBg: 'bg-amber-100 text-amber-700',
      confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
  }[variant] || {
    iconBg: 'bg-rose-100 text-rose-600',
    confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white',
  };

  return (
    <ResponsiveSheet
      open={Boolean(isOpen)}
      onClose={() => {
        if (!loading) onClose?.();
      }}
      title={title}
      description={message}
      showDefaultHeader={false}
      maxWidth="max-w-md"
      bodyClassName="px-5 pt-2 pb-6 sm:p-7"
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${variantStyles.iconBg}`}
        >
          <IconComponent className="w-6 h-6" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{message}</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={() => {
            hapticTap();
            onClose?.();
          }}
          disabled={loading}
          className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 sm:bg-transparent hover:bg-slate-100 active:scale-[0.98] transition cursor-pointer"
        >
          {cancelText}
        </button>

        <button
          type="button"
          onClick={() => {
            if (variant === 'danger') hapticWarning();
            else hapticTap();
            onConfirm?.();
          }}
          disabled={loading}
          className={`flex-1 sm:flex-none px-4 py-2.5 sm:py-2 rounded-xl text-xs font-bold active:scale-[0.98] transition cursor-pointer ${variantStyles.confirmBtn}`}
        >
          {loading ? 'Processing...' : confirmText}
        </button>
      </div>
    </ResponsiveSheet>
  );
}
