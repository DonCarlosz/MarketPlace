import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { hapticTap } from '../utils/haptics';

/**
 * Native-Style Fullscreen Photo Gallery Lightbox:
 * - Pinch-to-zoom (2 fingers) & double-tap zoom (1x <-> 2.2x)
 * - Pan while zoomed in
 * - Horizontal swipe left/right between photos
 * - Swipe-down-to-dismiss with live backdrop opacity fade
 * - Desktop keyboard arrows + Escape support
 */
export default function PhotoLightbox({
  open,
  images = [],
  currentIndex = 0,
  onChangeIndex,
  onClose,
  title = '',
}) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dismissY, setDismissY] = useState(0);
  const [dragging, setDragging] = useState(false);

  const gestureRef = useRef({
    mode: null, // 'pan' | 'swipe' | 'pinch'
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
    startDist: 0,
    startScale: 1,
    lastTapAt: 0,
  });

  // Reset zoom/pan when opening or switching photo
  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setDismissY(0);
    setDragging(false);
  }, [open, currentIndex]);

  // Keyboard shortcuts + body scroll lock
  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
      else if (e.key === 'ArrowRight' && images.length > 1) {
        onChangeIndex?.((currentIndex + 1) % images.length);
      } else if (e.key === 'ArrowLeft' && images.length > 1) {
        onChangeIndex?.((currentIndex - 1 + images.length) % images.length);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, currentIndex, images.length, onChangeIndex, onClose]);

  if (!open || images.length === 0) return null;

  const currentSrc = images[currentIndex] || images[0];

  const getTouchDistance = (t1, t2) =>
    Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

  const toggleDoubleTapZoom = () => {
    hapticTap();
    if (scale > 1.1) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
    } else {
      setScale(2.2);
      setOffset({ x: 0, y: 0 });
    }
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      gestureRef.current = {
        ...gestureRef.current,
        mode: 'pinch',
        startDist: getTouchDistance(e.touches[0], e.touches[1]),
        startScale: scale,
      };
      setDragging(true);
      return;
    }

    if (e.touches.length === 1) {
      const t = e.touches[0];
      const now = Date.now();
      if (now - gestureRef.current.lastTapAt < 280) {
        gestureRef.current.lastTapAt = 0;
        toggleDoubleTapZoom();
        return;
      }
      gestureRef.current = {
        ...gestureRef.current,
        mode: scale > 1.05 ? 'pan' : 'swipe',
        startX: t.clientX,
        startY: t.clientY,
        startOffsetX: offset.x,
        startOffsetY: offset.y,
        lastTapAt: now,
      };
      setDragging(true);
    }
  };

  const handleTouchMove = (e) => {
    const g = gestureRef.current;

    if (g.mode === 'pinch' && e.touches.length === 2 && g.startDist > 0) {
      const dist = getTouchDistance(e.touches[0], e.touches[1]);
      const nextScale = Math.max(1, Math.min(3.5, g.startScale * (dist / g.startDist)));
      setScale(nextScale);
      if (nextScale <= 1.02) setOffset({ x: 0, y: 0 });
      return;
    }

    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - g.startX;
    const dy = t.clientY - g.startY;

    if (g.mode === 'pan' && scale > 1.05) {
      const maxPan = 160 * (scale - 1);
      setOffset({
        x: Math.max(-maxPan, Math.min(maxPan, g.startOffsetX + dx)),
        y: Math.max(-maxPan, Math.min(maxPan, g.startOffsetY + dy)),
      });
    } else if (g.mode === 'swipe') {
      if (Math.abs(dy) > Math.abs(dx) && dy > 0) {
        setDismissY(dy);
      } else {
        setDismissY(0);
      }
    }
  };

  const handleTouchEnd = (e) => {
    const g = gestureRef.current;
    setDragging(false);

    if (g.mode === 'swipe') {
      const t = e.changedTouches?.[0];
      const dx = t ? t.clientX - g.startX : 0;
      const dy = t ? t.clientY - g.startY : 0;

      if (dy > 95 && Math.abs(dy) > Math.abs(dx)) {
        hapticTap();
        onClose?.();
        return;
      }
      if (images.length > 1 && Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) {
        hapticTap();
        if (dx < 0) onChangeIndex?.((currentIndex + 1) % images.length);
        else onChangeIndex?.((currentIndex - 1 + images.length) % images.length);
      }
    }

    setDismissY(0);
    if (scale < 1.05) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
    }
    gestureRef.current.mode = null;
  };

  const backdropAlpha = Math.max(0.25, 0.94 - Math.abs(dismissY) / 360);

  return (
    <div
      className="fixed inset-0 z-[120] flex flex-col justify-between select-none touch-none"
      style={{ backgroundColor: `rgba(2, 6, 23, ${backdropAlpha.toFixed(2)})` }}
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Photo viewer'}
    >
      {/* Top Bar */}
      <div
        className="flex items-center justify-between px-4 py-3 text-white z-20"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
      >
        <span className="text-xs font-bold bg-white/15 px-3 py-1 rounded-full tabular-nums">
          {currentIndex + 1} / {images.length}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleDoubleTapZoom}
            aria-label={scale > 1.1 ? 'Zoom out' : 'Zoom in'}
            className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition cursor-pointer"
          >
            {scale > 1.1 ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close photo viewer"
            className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden px-3"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => {
          if (e.target === e.currentTarget && scale <= 1.05) onClose?.();
        }}
      >
        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              hapticTap();
              onChangeIndex?.((currentIndex - 1 + images.length) % images.length);
            }}
            aria-label="Previous image"
            className="hidden sm:flex absolute left-4 z-20 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white items-center justify-center transition cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        <img
          src={currentSrc}
          alt={title || 'Listing image'}
          draggable={false}
          onDoubleClick={toggleDoubleTapZoom}
          className={`max-h-[82dvh] max-w-full object-contain rounded-lg ${
            dragging ? '' : 'transition-transform duration-200 ease-out'
          }`}
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y + dismissY}px, 0) scale(${scale})`,
          }}
        />

        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              hapticTap();
              onChangeIndex?.((currentIndex + 1) % images.length);
            }}
            aria-label="Next image"
            className="hidden sm:flex absolute right-4 z-20 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white items-center justify-center transition cursor-pointer"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip / Hint */}
      <div
        className="px-4 py-3 flex flex-col items-center gap-2 z-20"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {images.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto max-w-full no-scrollbar py-0.5">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  hapticTap();
                  onChangeIndex?.(idx);
                }}
                className={`w-11 h-11 rounded-lg overflow-hidden border-2 shrink-0 transition cursor-pointer ${
                  idx === currentIndex ? 'border-white opacity-100' : 'border-transparent opacity-55'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
        <span className="text-[11px] text-white/60 sm:hidden">
          Pinch or double-tap to zoom • Swipe down to close
        </span>
      </div>
    </div>
  );
}
