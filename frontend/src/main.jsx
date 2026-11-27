import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Enforce native non-zoomable app behavior on iOS Safari & mobile PWAs
if (typeof window !== 'undefined') {
  const preventGestureZoom = (e) => e.preventDefault();
  document.addEventListener('gesturestart', preventGestureZoom, { passive: false });
  document.addEventListener('gesturechange', preventGestureZoom, { passive: false });
  document.addEventListener('gestureend', preventGestureZoom, { passive: false });

  document.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  // Snap iOS visualViewport back cleanly if keyboard dismissal leaves a residual shift
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent || '') ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isIOS) {
    let viewportResetTimer = null;
    document.addEventListener('focusout', (e) => {
      const tag = e.target?.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') return;
      if (viewportResetTimer) window.clearTimeout(viewportResetTimer);
      viewportResetTimer = window.setTimeout(() => {
        const activeTag = document.activeElement?.tagName;
        if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return;
        const vv = window.visualViewport;
        if (vv && (Math.abs(vv.offsetTop) > 1 || Math.abs(vv.offsetLeft) > 1)) {
          window.scrollTo(window.scrollX, window.scrollY);
        }
      }, 90);
    });
  }
}

// Register PWA Service Worker for Mobile App Installability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[PWA] Service Worker registered:', reg.scope);
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });
  });
}

createRoot(document.getElementById('root')).render(
 <StrictMode>
 <App />
 </StrictMode>,
)
