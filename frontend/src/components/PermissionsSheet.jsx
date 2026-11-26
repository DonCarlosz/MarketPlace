import React, { useState } from 'react';
import ResponsiveSheet from './ResponsiveSheet';
import {
  PERMISSION_META,
  detectDevicePlatform,
  getRecoveryGuide,
} from '../utils/permissions';
import { useToast } from '../context/ToastContext';
import { hapticTap, hapticSuccess } from '../utils/haptics';
import {
  Bell,
  Mic,
  MapPin,
  Camera,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';

const ICON_BY_TYPE = {
  notifications: Bell,
  microphone: Mic,
  geolocation: MapPin,
  camera: Camera,
};

const PERMISSION_ORDER = ['notifications', 'microphone', 'geolocation', 'camera'];

function StatusPill({ state }) {
  if (state === 'granted') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
        <CheckCircle2 className="w-3 h-3" />
        Allowed
      </span>
    );
  }
  if (state === 'denied') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
        <AlertTriangle className="w-3 h-3" />
        Blocked
      </span>
    );
  }
  if (state === 'unsupported') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
        Not Available
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
      Not Set
    </span>
  );
}

export default function PermissionsSheet({
  sheetState,
  states,
  isAuthenticated,
  onClose,
  onConfirmRequest,
  onOpenRecovery,
  onRecheck,
  onBackToCenter,
}) {
  const { showToast } = useToast();
  const [busyType, setBusyType] = useState(null);
  const [rechecking, setRechecking] = useState(false);

  const isOpen = Boolean(sheetState);
  const mode = sheetState?.mode;
  const activeType = sheetState?.type;
  const meta = activeType ? PERMISSION_META[activeType] : null;
  const ActiveIcon = activeType ? ICON_BY_TYPE[activeType] || ShieldCheck : ShieldCheck;

  const handleTurnOn = async (type, returnToCenter = false) => {
    hapticTap();
    setBusyType(type);
    try {
      const result = await onConfirmRequest(type, returnToCenter);
      if (result === 'granted') {
        hapticSuccess();
        showToast(`${PERMISSION_META[type]?.label || 'Permission'} enabled.`, 'success');
      }
    } finally {
      setBusyType(null);
    }
  };

  const handleRecheckClick = async () => {
    if (!activeType) return;
    hapticTap();
    setRechecking(true);
    try {
      const next = await onRecheck(activeType);
      if (next === 'granted') {
        hapticSuccess();
        showToast(`${meta?.label || 'Permission'} is now active!`, 'success');
      } else {
        showToast(
          `${meta?.label || 'Permission'} is still blocked in device settings. Follow the 2 steps above, then check again.`,
          'info'
        );
      }
    } finally {
      setRechecking(false);
    }
  };

  return (
    <ResponsiveSheet
      open={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      showDefaultHeader={false}
      bodyClassName="p-0"
      title={
        mode === 'center'
          ? 'App Permissions'
          : mode === 'recovery'
          ? `Enable ${meta?.label || 'Permission'}`
          : meta?.warmHeadline || 'Permission Request'
      }
    >
      {/* MODE 1: Full In-App Permissions Center */}
      {mode === 'center' && (
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">App Permissions</h3>
                <p className="text-xs text-slate-500">
                  Manage alerts, voice notes, location & camera access
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              aria-label="Close App Permissions"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {PERMISSION_ORDER.map((type) => {
              const item = PERMISSION_META[type];
              const Icon = ICON_BY_TYPE[type];
              const state = states[type] || 'prompt';
              const isBusy = busyType === type;

              return (
                <div
                  key={type}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-4 h-4 text-slate-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-slate-900">{item.label}</span>
                          <StatusPill state={state} />
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                          {item.purpose}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                    {state === 'prompt' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleTurnOn(type, true)}
                        className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isBusy ? 'Requesting...' : 'Turn On'}
                      </button>
                    )}

                    {state === 'denied' && (
                      <button
                        type="button"
                        onClick={() => {
                          hapticTap();
                          onOpenRecovery(type);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        <span>How to Unblock</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {state === 'granted' && (
                      <span className="text-[11px] font-semibold text-emerald-700">
                        Active on this device
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
            Accidentally blocked a permission earlier? Tap "How to Unblock" above - you never need to clear cache or reinstall oBuy.
          </p>
        </div>
      )}

      {/* MODE 2: Layer 1 Pre-Permission Warm Ask Sheet */}
      {mode === 'warm' && meta && (
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
              <ActiveIcon className="w-6 h-6" />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-black text-slate-900">{meta.warmHeadline}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {sheetState.customReason || meta.warmBody}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Tapping <strong>Not Now</strong> leaves your device settings untouched so you can turn this on anytime later.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
            >
              Not Now
            </button>
            <button
              type="button"
              disabled={busyType === activeType}
              onClick={() => handleTurnOn(activeType, false)}
              className="py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              {busyType === activeType ? 'Waiting...' : meta.allowButtonText}
            </button>
          </div>
        </div>
      )}

      {/* MODE 3: Layer 3 OS-Aware Blocked Permission Recovery Sheet */}
      {mode === 'recovery' && meta && (() => {
        const guide = getRecoveryGuide(activeType, detectDevicePlatform());
        return (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                  <ActiveIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {meta.label} Is Currently Blocked
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-500">{guide.deviceLabel}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                aria-label="Close Recovery Guide"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Your device blocked {meta.label.toLowerCase()} access for oBuy earlier. Follow these 2 quick steps to turn it back on without clearing your cache:
            </p>

            <div className="space-y-2.5">
              {guide.steps.map((stepText, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200"
                >
                  <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <p className="text-xs text-slate-800 leading-relaxed font-medium">{stepText}</p>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 leading-relaxed">
              {guide.tip}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onBackToCenter}
                className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
              >
                All Permissions
              </button>
              <button
                type="button"
                disabled={rechecking}
                onClick={handleRecheckClick}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${rechecking ? 'animate-spin' : ''}`} />
                <span>{rechecking ? 'Checking...' : 'Re-check'}</span>
              </button>
            </div>
          </div>
        );
      })()}
    </ResponsiveSheet>
  );
}
