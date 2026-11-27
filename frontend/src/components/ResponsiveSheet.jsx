import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Drawer } from 'vaul';
import { X } from 'lucide-react';

const MOBILE_QUERY = '(max-width: 639px)';

function detectIOSDevice() {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent || '') ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_QUERY).matches : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    if (mq.addEventListener) {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);

  return isMobile;
}

/**
 * Native-grade Responsive Sheet:
 * - Mobile (< 640px): Draggable iOS/Android bottom sheet powered by Vaul with velocity swipe-to-dismiss.
 * - Desktop (>= 640px): Crisp centered dialog modal with Escape key & backdrop dismiss.
 */
export default function ResponsiveSheet({
  open,
  onClose,
  title = '',
  description = '',
  maxWidth = 'max-w-md',
  headerSlot = null,
  showDefaultHeader = true,
  showCloseButton = true,
  bodyClassName = 'p-5 sm:p-6',
  children,
}) {
  const isMobile = useIsMobileViewport();
  const isIOS = useMemo(() => detectIOSDevice(), []);

  const handleClose = useCallback(() => {
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      const tag = document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        document.activeElement.blur();
      }
    }
    onClose?.();
  }, [onClose]);

  // Escape-key dismissal on desktop modal
  useEffect(() => {
    if (!open || isMobile) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, isMobile, handleClose]);

  // Prevent background page scroll on desktop modal
  useEffect(() => {
    if (!open || isMobile || typeof document === 'undefined') return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open, isMobile]);

  if (isMobile) {
    return (
      <Drawer.Root
        open={Boolean(open)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) handleClose();
        }}
        shouldScaleBackground={false}
        repositionInputs={!isIOS}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[100] bg-slate-900/55" />
          <Drawer.Content
            className="fixed inset-x-0 bottom-0 z-[101] flex flex-col bg-white rounded-t-3xl border-t border-slate-200 max-h-[92dvh] outline-none"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            {/* Native Drag Pill */}
            <div className="pt-2.5 pb-1.5 flex justify-center shrink-0">
              <div className="w-10 h-1.5 rounded-full bg-slate-300" />
            </div>

            {/* Accessible screen-reader title/description if custom header used */}
            {!showDefaultHeader && (
              <>
                <Drawer.Title className="sr-only">{title || 'Dialog'}</Drawer.Title>
                <Drawer.Description className="sr-only">
                  {description || title || 'Sheet content'}
                </Drawer.Description>
              </>
            )}

            {headerSlot ? (
              <div className="shrink-0">{headerSlot}</div>
            ) : showDefaultHeader && (title || showCloseButton) ? (
              <div className="flex items-start justify-between gap-3 px-5 pt-1 pb-3.5 border-b border-slate-100 shrink-0">
                <div className="min-w-0">
                  {title && (
                    <Drawer.Title className="text-base font-black text-slate-900 leading-tight">
                      {title}
                    </Drawer.Title>
                  )}
                  {description && (
                    <Drawer.Description className="text-xs text-slate-500 mt-0.5 leading-snug">
                      {description}
                    </Drawer.Description>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={handleClose}
                    aria-label="Close"
                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : null}

            <div className={`overflow-y-auto overscroll-contain flex-1 min-h-0 ${bodyClassName}`}>
              {children}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/55"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Dialog'}
      onClick={handleClose}
    >
      <div
        className={`bg-white rounded-3xl border border-slate-200 ${maxWidth} w-full max-h-[88dvh] flex flex-col overflow-hidden relative`}
        onClick={(e) => e.stopPropagation()}
      >
        {headerSlot ? (
          <div className="shrink-0">{headerSlot}</div>
        ) : showDefaultHeader && (title || showCloseButton) ? (
          <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-slate-100 shrink-0">
            <div className="min-w-0">
              {title && (
                <h3 className="text-base font-black text-slate-900 leading-tight">{title}</h3>
              )}
              {description && (
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">{description}</p>
              )}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : null}

        <div className={`overflow-y-auto overscroll-contain flex-1 min-h-0 ${bodyClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
