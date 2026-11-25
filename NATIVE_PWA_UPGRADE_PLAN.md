# oBuy Native-Feel PWA Upgrade Plan

> **Goal:** Upgrade the installed oBuy Progressive Web App from feeling like *"a website wrapped in a home-screen icon"* into a responsive, tactile, gesture-driven mobile experience rivaling WhatsApp, Jiji, and native iOS/Android marketplace apps, while keeping a single React + Vite codebase.

---

## Why the Installed PWA Currently Feels Like a Website

Even with `display: "standalone"` and a bottom navigation bar, mobile users subconsciously recognize a website because of 7 specific "browser tells":

1. **Instant Hard Cuts Between Screens:** Tapping a listing or chat thread jumps instantaneously with no directional push/pop motion.
2. **Centered Desktop Dialogs on Mobile:** Modals (Auth, Make Offer, Meetup Spots, Filters, AI Co-Pilot) pop into the middle of the screen instead of sliding up as thumb-friendly draggable bottom sheets.
3. **No Mobile Gestures:** Pulling down at the top of `/market` or `/messages` triggers nothing (or an awkward browser reload), and image lightboxes do not support pinch-to-zoom or swipe-down-to-dismiss.
4. **Zero Tactile Feedback:** Buttons, likes, tab switches, and voice recording give no micro-haptic pulse.
5. **Browser Text/Callout Leaks:** Long-pressing images or nav labels can trigger browser menus or blue highlight rings.
6. **Dead When Closed or Offline:** Closing the PWA stops notifications (no Web Push), the home screen icon never shows an unread count badge, and opening the app on weak Nigerian mobile data shows blank loading states instead of instant cached content.
7. **White Launch Flash & Keyboard Jumps:** Opening the installed app flashes white before React mounts, and opening the keyboard in Chat can cause viewport jumps without `interactive-widget=resizes-content`.

---

## Recommended Dependencies & Built-In Native Web APIs

Keep the bundle lean so oBuy stays fast on mid-range Nigerian Android phones and 3G/4G networks.

### Lightweight npm Packages

| Package | Approx. Gzipped Size | Native Capability Unlocked |
| :--- | :--- | :--- |
| **`vaul`** | ~6 KB | Authentic iOS/Android draggable bottom sheets with velocity physics, backdrop scaling, and swipe-to-dismiss |
| **`framer-motion`** (`LazyMotion` + `domAnimation`) | ~15 KB | 60fps spring animations, stack push/pop screen transitions, shared-element tab pills, and gesture-driven dismiss |
| **`idb-keyval`** | ~0.6 KB | Instant IndexedDB persistence so reopening the PWA renders cached listings, inbox, and profile immediately even offline |
| **`yet-another-react-lightbox`** (or custom touch hook) | ~8 KB | Native pinch-to-zoom, double-tap zoom, and swipe-down-to-close photo viewer on `/listing/:id` |
| **`web-push`** *(backend only)* | 0 KB client | Sends real W3C VAPID push notifications to Android & iOS PWAs even when the app is completely closed |

### Zero-Dependency Browser APIs (Already Built Into Modern Phones)

| Native Web API | Where to Use in oBuy | Support |
| :--- | :--- | :--- |
| **App Badging API** (`navigator.setAppBadge`) | Displays the live unread chat/request counter directly on the home-screen oBuy app icon | Android Chrome/Edge, iOS 16.4+ PWA, Windows/macOS PWA |
| **Vibration / Haptics API** (`navigator.vibrate`) | Subtle 10-25ms pulses on BottomNav switch, Heart favorite, Voice record start/stop, and Long-press chat options | Android Chrome/PWA (safe no-op on iOS) |
| **Web Share API** (`navigator.share`) | Opens the real phone Share Sheet (WhatsApp, X, Telegram, AirDrop) when tapping Share on `/listing/:id` | Android & iOS Safari/PWA |
| **Web Share Target** (`manifest.json`) | Lets users select photos in their phone Gallery -> tap Share -> choose **oBuy** to jump straight into Post Listing with photos preloaded | Android installed PWA |
| **Screen Wake Lock API** (`navigator.wakeLock`) | Keeps the phone screen awake while recording a long voice note or uploading multiple photos | Android & iOS 16.4+ Safari |
| **VisualViewport + `interactive-widget`** | Keeps the Chat composer glued smoothly to the top edge of the mobile keyboard like WhatsApp | Android Chrome, iOS Safari |

---

## 4-Phase Implementation Roadmap

### Phase 1: Native Chrome, Bottom Sheets & Tactile Feel (Highest Immediate Impact)
*Estimated effort: 1 to 2 days*

1. **Create a Reusable Mobile Bottom Sheet Component (`vaul`)**:
   - On `< sm` viewports, render modals as draggable bottom sheets with a top drag handle (`w-10 h-1 rounded-full bg-slate-300`), rounded top corners (`rounded-t-3xl`), and swipe-down-to-dismiss. Keep centered dialogs on desktop (`sm+`).
   - Convert: `AuthModal`, `ConfirmModal`, Market Filters drawer, `Make Offer`, `Counter Offer`, `Suggest Safe Meetup Spot`, `AI Inspection Tips`, `Leave Review`, and `AI Listing Co-Pilot`.
2. **Global Haptics Utility (`frontend/src/utils/haptics.js`)**:
   - Export semantic pulses: `hapticTap()` (`8ms`), `hapticSuccess()` (`[12, 40, 12]`), `hapticWarning()` (`[20, 30, 20]`), `hapticLongPress()` (`25ms`).
   - Wire into `BottomNav`, favorite heart buttons, voice recorder start/send/cancel, and chat long-press.
3. **Eliminate Remaining "Website Tells" in `index.html` & `index.css`**:
   - Update viewport meta to include `interactive-widget=resizes-content` so Android keyboards resize the Chat layout cleanly without shifting `<Navbar />`.
   - Apply `touch-action: manipulation`, `-webkit-touch-callout: none`, and `user-select: none` on navigation chrome, buttons, icons, and listing cards (while keeping message bubbles and listing descriptions selectable).
   - Add crisp active press feedback (`active:scale-[0.97]`) on interactive cards, tabs, and buttons.
4. **Replace Generic Spinners with Native Shimmer Skeletons**:
   - Upgrade `PageLoader` and detail/chat loading states to structured content skeletons matching exact final card heights so screens never jump.

---

### Phase 2: App-Like Navigation Physics & Gestures
*Estimated effort: 2 days*

1. **Directional Route Transitions (`framer-motion` `LazyMotion`)**:
   - **Top-level BottomNav tabs** (`/`, `/market`, `/messages`, `/profile`): instant zero-delay switch (just like native iOS/Android tab bars).
   - **Detail / drill-down routes** (`/listing/:id`, `/profile/:userId`, `/create`, opening a chat thread on mobile): smooth 180ms slide-in from the right (`x: 24 -> 0`, opacity `0 -> 1`) and reverse slide on Back.
   - Respect `prefers-reduced-motion` automatically.
2. **Custom Pull-to-Refresh (`frontend/src/components/PullToRefresh.jsx`)**:
   - Attach smooth touch pull physics at `scrollY === 0` on `/`, `/market`, `/messages`, and `/profile` with a crisp circular refresh indicator and haptic snap when threshold is reached, refreshing SWR route data cleanly without full page reloads.
3. **Native Photo Gallery Lightbox (`ListingDetailPage.jsx`)**:
   - Upgrade the fullscreen photo lightbox with pinch-to-zoom, horizontal swipe between photos, double-tap zoom, and swipe-down-to-close with smooth backdrop fade.
4. **Universal Per-Tab Scroll Restoration**:
   - Persist scroll offsets per route inside `routeCache.js` so backing out of a listing detail returns the user to the exact pixel in `/`, `/market`, or `/profile`.

---

### Phase 3: OS-Level Native Integration & Offline-First Speed
*Estimated effort: 2 to 3 days*

1. **Home-Screen App Icon Badge (`navigator.setAppBadge`)**:
   - Sync `unreadCount` inside `NotificationContext.jsx` directly to `navigator.setAppBadge(unreadCount)` (and `navigator.clearAppBadge()` when `0`). Users immediately see unread messages on the oBuy app icon on their phone home screen.
2. **Real Background Push Notifications (Web Push / VAPID)**:
   - Backend: install `web-push`, store user `pushSubscriptions` in MongoDB, and dispatch push payloads on new messages, voice notes, price offers, and message requests when the recipient is offline or away.
   - Service Worker (`frontend/public/sw.js`): add `push` and `notificationclick` listeners so tapping a lock-screen notification launches oBuy directly into `/messages?conversationId=<id>`.
3. **Offline-First Persisted Cache (`idb-keyval`)**:
   - Persist `landingFeaturedCache`, `listingsCache`, `chatInboxCache`, and `profileRouteCache` into IndexedDB (`idb-keyval`) with stale-while-revalidate refresh on launch.
   - Result: opening oBuy even in Airplane Mode or poor reception renders the UI and last-viewed listings/inbox in `< 100ms`, accompanied by a subtle top `"Offline - showing saved data"` pill that auto-syncs on reconnect.
4. **Native Share Sheet & Share Target**:
   - Wire Share on `/listing/:id` to `navigator.share({ title, text, url })` (falls back to clipboard copy on desktop).
   - Add `share_target` to `frontend/public/manifest.json` so Android users can share photos from their camera roll directly into `/create`.
5. **Instant Branded Splash Screens (Zero White Flash)**:
   - Once the final oBuy logo & brand palette are locked, render an inline SVG splash screen inside `#root` in `index.html` (vanishes the instant React hydrates) + `apple-touch-startup-image` meta links for iOS PWAs.
6. **Screen Wake Lock for Voice Notes**:
   - Request `navigator.wakeLock.request('screen')` while `isRecording` is active in `ChatPage.jsx`, releasing it cleanly when recording stops.

---

### Phase 4: Real App Store Distribution (Zero Code Rewrite)
*Optional - when ready for Play Store & Apple App Store presence*

1. **Google Play Store via Bubblewrap (TWA - Trusted Web Activity)** *(Fastest: ~1 day)*:
   - Packages the live hosted `https://obuy.ng` PWA into a signed Android App Bundle (`.aab`) with verified `assetlinks.json`.
   - Zero URL bar, real Play Store reviews/discovery, ~1 MB APK download size, and every web push updates the Play Store app immediately without store review delays.
2. **iOS App Store + Play Store via Capacitor (`@capacitor/core`)** *(When scaling further)*:
   - Wraps the exact existing Vite `dist/` frontend inside a native iOS/Android shell without rewriting React.
   - Unlocks full native plugins when needed: `@capacitor/haptics` (works on iPhone Taptic Engine!), `@capacitor/push-notifications` (native APNs/FCM without requiring iOS "Add to Home Screen"), `@capacitor/camera`, and `@capacitor/status-bar`.

---

## Suggested Execution Order

1. **First:** Finalize the custom **oBuy Logo & Brand Color Tokens** (from `PRODUCTION_READINESS_PLAN.md`) so bottom sheets, splash screens, and maskable icons all inherit the final brand identity cleanly.
2. **Next (Phase 1 + Phase 2):** Install `vaul` + `framer-motion` (`LazyMotion`), build mobile bottom sheets, haptics, pull-to-refresh, stack transitions, and pinch-zoom gallery. This alone transforms 80% of the perceived "website vs native app" gap.
3. **Then (Phase 3):** Add `navigator.setAppBadge`, VAPID Web Push, `idb-keyval` offline cache, native Share/Share Target, and branded launch splash screens.
4. **Finally (Phase 4):** Publish to Google Play Store via Bubblewrap TWA (and Capacitor when ready for the Apple App Store).
