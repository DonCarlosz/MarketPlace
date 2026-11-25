import React from 'react';

/**
 * Official oBuy Vector Mark:
 * Forward-slanted Turbo O ring + 3 speed streaks (#3) fused with detailed rounded shopping cart (#1).
 */
export function BrandMark({ className = 'w-9 h-9', title = 'oBuy logo' }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={title}
    >
      <g transform="skewX(-9) translate(5.5 0)">
        {/* 3 Tapered Motion Streaks */}
        <rect x="2.5" y="21" width="11" height="3.6" rx="1.8" fill="currentColor" opacity="0.95" />
        <rect x="0.5" y="29.2" width="12.5" height="3.6" rx="1.8" fill="currentColor" />
        <rect x="4" y="37.4" width="10" height="3.6" rx="1.8" fill="currentColor" opacity="0.9" />

        {/* Dynamic Slanted Circular O Ring */}
        <ellipse cx="37.5" cy="32" rx="21.2" ry="20.8" stroke="currentColor" strokeWidth="5.6" />

        {/* Crisp Detailed Shopping Cart Inside O */}
        <path
          d="M24.5 23.5H28.3L31.4 37.2C31.7 38.4 32.8 39.2 34 39.2H44.6C45.8 39.2 46.8 38.4 47.1 37.2L49.2 28.4H29.4"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1="30.6"
          y1="33.2"
          x2="47.8"
          y2="33.2"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="34.2" cy="44" r="2.5" fill="currentColor" />
        <circle cx="44.2" cy="44" r="2.5" fill="currentColor" />
      </g>
    </svg>
  );
}

/**
 * Full oBuy Logo Lockup or Standalone App Tile Badge.
 * Variants:
 * - "default": Indigo O-cart mark + bold dark "Buy" wordmark (Navbar, Footer, Modals)
 * - "badge": White O-cart mark inside solid Indigo rounded tile + "oBuy" or icon-only
 * - "inverse": White O-cart mark + white "Buy" wordmark for dark/brand backgrounds
 */
export default function BrandLogo({
  variant = 'default',
  size = 'md',
  showWordmark = true,
  className = '',
}) {
  const sizeMap = {
    xs: { mark: 'w-5 h-5', tile: 'w-6 h-6 rounded-lg p-1', text: 'text-sm' },
    sm: { mark: 'w-7 h-7', tile: 'w-8 h-8 rounded-xl p-1', text: 'text-lg' },
    md: { mark: 'w-9 h-9', tile: 'w-9 h-9 rounded-xl p-1.5', text: 'text-[22px]' },
    lg: { mark: 'w-11 h-11', tile: 'w-12 h-12 rounded-2xl p-2', text: 'text-2xl' },
  };
  const s = sizeMap[size] || sizeMap.md;

  if (variant === 'badge') {
    return (
      <span className={`inline-flex items-center gap-2 select-none ${className}`}>
        <span
          className={`${s.tile} bg-indigo-600 text-white inline-flex items-center justify-center shrink-0`}
        >
          <BrandMark className="w-full h-full" />
        </span>
        {showWordmark && (
          <span className={`font-black ${s.text} tracking-tight text-slate-900 leading-none`}>
            oBuy
          </span>
        )}
      </span>
    );
  }

  if (variant === 'inverse') {
    return (
      <span className={`inline-flex items-center gap-1 select-none text-white ${className}`}>
        <BrandMark className={`${s.mark} shrink-0`} />
        {showWordmark && (
          <span className={`font-black ${s.text} tracking-tight text-white leading-none -ml-0.5`}>
            Buy
          </span>
        )}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-0.5 select-none ${className}`}>
      <BrandMark className={`${s.mark} text-indigo-600 shrink-0`} />
      {showWordmark && (
        <span className={`font-black ${s.text} tracking-tight text-slate-900 leading-none`}>
          Buy
        </span>
      )}
    </span>
  );
}
