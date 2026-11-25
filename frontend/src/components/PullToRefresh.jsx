import React, { useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { hapticTap, hapticSuccess } from '../utils/haptics';

const TRIGGER_THRESHOLD = 62;
const MAX_PULL = 96;

/**
 * Native Mobile Pull-to-Refresh Wrapper:
 * Smoothly pulls a floating circular refresh badge at scrollY === 0 without reloading the browser page.
 */
export default function PullToRefresh({ onRefresh, disabled = false, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startRef = useRef({ active: false, x: 0, y: 0, crossed: false });

  const handleTouchStart = (e) => {
    if (disabled || refreshing) return;
    if (typeof window === 'undefined' || window.scrollY > 2) return;
    // Do not intercept drags inside open modals/bottom sheets
    if (document.querySelector('[role="dialog"], [data-vaul-drawer]')) return;
    const touch = e.touches?.[0];
    if (!touch) return;
    startRef.current = { active: true, x: touch.clientX, y: touch.clientY, crossed: false };
  };

  const handleTouchMove = (e) => {
    if (!startRef.current.active || refreshing) return;
    if (window.scrollY > 2) {
      startRef.current.active = false;
      setPullDistance(0);
      return;
    }
    const touch = e.touches?.[0];
    if (!touch) return;

    const dx = touch.clientX - startRef.current.x;
    const dy = touch.clientY - startRef.current.y;

    // Ignore horizontal swipes (e.g. carousels) or upward scrolls
    if (dy <= 6 || Math.abs(dx) > dy * 0.85) {
      if (pullDistance > 0) setPullDistance(0);
      return;
    }

    const damped = Math.min(MAX_PULL, Math.round(dy * 0.45));
    if (damped >= TRIGGER_THRESHOLD && !startRef.current.crossed) {
      startRef.current.crossed = true;
      hapticTap();
    } else if (damped < TRIGGER_THRESHOLD && startRef.current.crossed) {
      startRef.current.crossed = false;
    }
    setPullDistance(damped);
  };

  const handleTouchEnd = async () => {
    if (!startRef.current.active) return;
    startRef.current.active = false;

    if (pullDistance >= TRIGGER_THRESHOLD && typeof onRefresh === 'function') {
      setRefreshing(true);
      setPullDistance(54);
      try {
        await onRefresh();
        hapticSuccess();
      } catch {
        // Ignore refresh error; individual pages handle toasts
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  const progress = Math.min(1, pullDistance / TRIGGER_THRESHOLD);
  const showIndicator = pullDistance > 8 || refreshing;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="relative w-full"
    >
      {/* Floating Native Pull Indicator */}
      <div
        aria-hidden={!showIndicator}
        className="pointer-events-none fixed left-1/2 z-30 -translate-x-1/2 transition-transform duration-150"
        style={{
          top: 'calc(4.25rem + env(safe-area-inset-top, 0px))',
          transform: `translate(-50%, ${showIndicator ? Math.max(4, pullDistance - 38) : -48}px)`,
          opacity: showIndicator ? Math.max(0.25, progress) : 0,
        }}
      >
        <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-brand-600">
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
            style={
              !refreshing ? { transform: `rotate(${Math.round(progress * 260)}deg)` } : undefined
            }
          />
        </div>
      </div>

      {children}
    </div>
  );
}
