# oBuy Production Readiness & Real-World Launch Audit Plan

> **Audit Scope:** Full-stack critical review of `oBuy` (React + Vite PWA frontend, Node.js + Express + Socket.IO + MongoDB Atlas backend, Brevo transactional email, Gemini AI) prior to public real-world launch in Nigeria.
> **Companion Plan:** See [`NEW_ROUTES_PLAN.md`](./NEW_ROUTES_PLAN.md) for the deferred eBay-style routes (`/offers`, `/recent`, `/settings`, `/safety`, `/saved-sellers`).

---

## Executive Summary

oBuy's core peer-to-peer marketplace loop (listing creation with AI Co-Pilot, discovery, saved watchlist, real-time Socket.IO chat, price offers/counter-offers, voice notes, safe meetup spots, user blocking, and seller reputation scorecards) is working end-to-end.

However, putting the app in front of real Nigerian buyers and sellers today would expose **specific technical, cost, security, and trust bottlenecks** that will either break core flows, cause sudden billing/quota outages, or hurt conversion. Every item below was verified directly against the current codebase and ranked by launch impact.

| Priority | Category | Why It Matters Before Launch |
| :--- | :--- | :--- |
| **P0 (Launch Blockers)** | Branding/Logo, Media Storage Scaling, CORS Tightening, Email Domain Auth, Legal/Demo Data Cleanup | Prevents DB crashes, spam-folder OTPs, brand re-work, and security/legal exposure |
| **P1 (High Impact UX & Trust)** | Edit Listing, Web Push Notifications, Cross-Device Voice Compatibility (Android <-> iPhone), Market Pagination, Admin Moderation | Prevents lost deals, broken voice notes on iPhone, invisible listings past #50, and unchecked scams |
| **P2 (Growth & Retention)** | WhatsApp OpenGraph Previews, Always-On Hosting, In-Chat Photo Sharing & Read Receipts, AI Cost Guardrails | Multiplies organic WhatsApp sharing and eliminates 45-second Render cold starts |
| **P3 (Polish & Scale)** | Floating AI Button Docking, Footer Live Links, Monitoring/Backups, Automated CI Tests | Long-term maintainability and operational peace of mind |

---

## P0: Launch Blockers (Fix Before Public Users)

### 1. Custom oBuy Logo, Brand Identity & Semantic Color System (Do First)
- **Current Gap:**
  - `frontend/src/components/Navbar.jsx` and `frontend/src/components/Footer.jsx` use a generic Lucide `<Store>` icon inside a purple/indigo box (`bg-indigo-600`).
  - PWA icons (`frontend/public/favicon.svg`, `icon-192.png`, `icon-512.png`, `maskable-icon-512.png`, `apple-touch-icon.png`) and the OTP email header (`backend/src/utils/email.js`) use placeholder graphics and `#4f46e5` indigo.
  - Brand colors (`indigo-600`, `indigo-700`, `purple-600`, etc.) are hardcoded across 25+ JSX files instead of semantic theme tokens. Changing brand color later (for example to orange, emerald, or dark slate) will require tedious find-and-replace across the entire app.
- **Action Plan:**
  1. Finalize the primary oBuy brand palette (primary accent, hover accent, soft tint, neutral surface) and declare CSS variables + Tailwind semantic tokens (`brand`, `brand-hover`, `brand-soft`) in `frontend/tailwind.config.js` and `frontend/src/index.css`.
  2. Design a clean, recognizable geometric `oBuy` logomark + wordmark SVG that reads clearly at `16px` (favicon), `36px` (Navbar), and `512px` (Android/iOS splash screen).
  3. Generate all required icon assets from the master SVG: `favicon.svg`, `favicon.ico`, `icon-192.png`, `icon-512.png`, `maskable-icon-512.png` (with safe-zone padding), `apple-touch-icon.png`, and `og-default.png` (1200x630).
  4. Replace hardcoded `indigo-*` brand classes with semantic `brand-*` classes across components and update the OTP email template in `backend/src/utils/email.js` to embed the hosted logo.

### 2. Migrate Media Storage Out of MongoDB Atlas + Add Orphan Cleanup (Major Cost & Outage Trap)
- **Current Gap:**
  - `backend/src/routes/uploadRoutes.js` stores uploaded listing images, avatars, cover banners, and voice notes (up to 5 MB each) as binary `Buffer` documents inside MongoDB Atlas (`Media` collection).
  - **Outage Risk:** MongoDB Atlas Free Tier (M0) has a hard **512 MB total storage cap** (shared by all users, listings, chats, indexes, and binary media). Around 400-500 active listings + voice messages will exhaust 512 MB and crash **every database write** (`space quota exceeded`).
  - **Orphan Leak:** `deleteListing` in `backend/src/controllers/listingController.js` does not remove associated `Media` documents, and replacing a user's avatar or cover image in `ProfilePage.jsx` leaves the old files permanently stored in MongoDB. Abandoned drafts also leak storage indefinitely.
- **Action Plan:**
  1. Move uploaded images and audio to **Cloudflare R2** (10 GB free tier, **zero egress bandwidth fees**, S3-compatible API via `@aws-sdk/client-s3`) or **Cloudinary**. Serve assets behind a fast CDN custom domain (`media.obuy.ng`).
  2. Keep Sharp server-side WebP compression & EXIF stripping before uploading to R2 so every image stays under ~150 KB.
  3. Add cleanup hooks: when a listing is deleted or an avatar/cover is replaced, delete the old object key from R2 (and clean up any legacy `Media` docs).
  4. Add a scheduled cleanup job to purge unreferenced draft uploads older than 24 hours.

### 3. Tighten Backend CORS Allowlist (Security Vulnerability)
- **Current Gap:**
  - In `backend/src/server.js` (lines 56-58), `isOriginAllowed` allows any origin ending with `.vercel.app`, `.onrender.com`, or `.netlify.app` with `credentials: true`.
  - Any third-party site hosted on Vercel, Render, or Netlify could issue cross-origin credentialed requests against the oBuy backend API.
- **Action Plan:**
  1. Remove wildcard `.vercel.app`, `.onrender.com`, and `.netlify.app` suffix matches in production.
  2. Restrict `isOriginAllowed` strictly to exact domains listed in `process.env.ALLOWED_ORIGINS` (e.g., `https://obuy.ng,https://www.obuy.ng,https://<your-exact-vercel-domain>.vercel.app`), keeping `localhost` / LAN IPs enabled only when `NODE_ENV !== 'production'`.

### 4. Authenticate a Custom Email Domain for OTP Deliverability
- **Current Gap:**
  - `backend/src/utils/email.js` defaults `BREVO_SENDER_EMAIL` to a personal Gmail address (`denrichy111@gmail.com`) and falls back to it on failure.
  - Sending automated OTP emails from `@gmail.com` via a third-party SMTP/API (Brevo) fails Gmail's strict **DMARC** policy, causing verification codes and password resets to land in Spam or get silently dropped.
  - Brevo's free tier is also capped at **300 emails/day**.
- **Action Plan:**
  1. Register your production domain (e.g. `obuy.ng`) and configure **SPF, DKIM, and DMARC** DNS records inside Brevo.
  2. Set `BREVO_SENDER_EMAIL=no-reply@obuy.ng` and `BREVO_SENDER_NAME=oBuy` in Render environment variables and remove the personal Gmail fallback.
  3. Monitor daily email volume and upgrade Brevo (or add Resend as a failover provider) once signups approach 200+/day.

### 5. Clean Out US Demo / Seed Data Before Going Live
- **Current Gap:**
  - MongoDB Atlas currently contains ~17 seed listings with non-Nigerian locations (`Downtown`, `Northside`) and non-Naira demo prices alongside Nigerian test accounts.
- **Action Plan:**
  1. Run a pre-launch cleanup script to purge foreign demo listings, test conversations, and placeholder accounts (`marcus@example.com`, `elena@example.com`, `david@example.com`, `Test Buyer`).
  2. Replace them with real vetted Nigerian launch inventory (or clearly seeded local beta vendors in Uromi/Benin/Lagos/Abuja) so early adopters immediately trust the platform.

### 6. Publish Real Legal & Safety Pages (NDPA Compliance & Liability Protection)
- **Current Gap:**
  - In `frontend/src/components/Footer.jsx` (lines 42-57), `Terms of Service`, `Privacy Policy`, `Community Guidelines`, and `Zero Payment Liability Rule` are rendered as non-clickable static text spans (`static: true`).
  - As a peer-to-peer classifieds marketplace operating in Nigeria, oBuy requires clear legal terms under the **Nigeria Data Protection Act (NDPA)** and explicit peer-to-peer meetup liability disclaimers.
- **Action Plan:**
  1. Create real routes: `/terms`, `/privacy`, and `/safety` (with prohibited items list, anti-scam fake transfer verification guide, and zero-escrow liability notice).
  2. Wire all Footer items to their real routes and add `"By signing up, you agree to oBuy's Terms of Service and Privacy Policy"` inside `AuthModal.jsx`.
  3. Add a self-serve **Delete Account** option inside `/settings` (required for NDPA compliance and Google Play TWA / App Store approval if packaged later).

---

## P1: High-Impact Functional & Trust Gaps

### 7. Cross-Platform Voice Note Compatibility (Android <-> iPhone Safari Bug)
- **Current Gap:**
  - `frontend/src/pages/ChatPage.jsx` records voice notes using `MediaRecorder` (`audio/webm;codecs=opus` on Android/Chrome, `audio/mp4` on iOS Safari) and uploads the raw file directly via `POST /api/upload/audio`.
  - **Real-World Breakage:** iOS Safari does **not** reliably play `audio/webm` files recorded on Android phones! In Nigeria, where buyers and sellers constantly message between Android (Tecno, Infinix, Samsung) and iPhone devices, voice notes recorded on Android will fail to play on iPhone.
- **Action Plan:**
  1. On upload in `backend/src/routes/uploadRoutes.js` (or via Cloudinary audio transformation / lightweight `ffmpeg-static` transcode), convert incoming `audio/webm` and `audio/ogg` voice notes into universal **MP3 or AAC (`.m4a`)** (`64 kbps` mono, tiny file size).
  2. Store and serve the universal `.m4a`/`.mp3` file so every Android, iPhone, Windows, and macOS browser plays every voice note reliably.

### 8. Background Push Notifications (Web Push / VAPID) for Closed PWA
- **Current Gap:**
  - `frontend/src/context/NotificationContext.jsx` delivers real-time WhatsApp-style notifications only while the oBuy tab/PWA is open and connected to Socket.IO.
  - When a seller locks their phone or closes the PWA, Socket.IO disconnects and they receive **zero notifications** for new buyer messages, offers, or message requests.
- **Action Plan:**
  1. Generate VAPID keypair (`web-push` npm package) and store keys in Render environment variables.
  2. Add `pushSubscriptions: [{ endpoint, keys: { p256dh, auth } }]` to `backend/src/models/User.js` and create `POST /api/notifications/subscribe` & `DELETE /api/notifications/unsubscribe`.
  3. In `chatController.js`, whenever a message, voice note, offer, or message request is created and the recipient is not actively viewing that conversation, dispatch a Web Push payload.
  4. Add `push` and `notificationclick` event handlers inside `frontend/public/sw.js` so tapping a notification opens `/messages?conversationId=...` directly in the PWA.

### 9. Edit Published Listings (Frontend Flow Missing)
- **Current Gap:**
  - `PUT /api/listings/:id` (`updateListing`) already exists in `backend/src/routes/listingRoutes.js`, but there is **no UI anywhere on the frontend** to edit a listing after posting.
  - Sellers who need to adjust a price, fix a typo, or swap photos must delete their listing (losing views, favorites, and chat history) and repost.
- **Action Plan:**
  1. Add an `"Edit Listing"` route (`/edit/:id`) reusing `CreateListingPage.jsx` in edit mode (pre-populated with title, price, category, specifics, location, and existing photos).
  2. Add an `"Edit"` button to the active listing `⋮` dropdown in `ListingCard.jsx` and to the owner action bar in `ListingDetailPage.jsx`.

### 10. Market Feed Pagination / Infinite Scroll & Search Indexing
- **Current Gap:**
  - `backend/src/controllers/listingController.js` caps `limit` at `50` (`safeLimit = Math.min(50, ...)`), and `frontend/src/pages/HomePage.jsx` only ever fetches `page=1`. Once oBuy exceeds 50 active listings, **older items vanish from `/market`**.
  - Keyword search uses unanchored `$regex` across 5 fields, forcing slow full-collection scans (`COLLSCAN`) as the database grows.
  - Inactive/abandoned listings never expire.
- **Action Plan:**
  1. Add `"Load More"` / `IntersectionObserver` pagination in `HomePage.jsx` using `res.data.pagination` (`page`, `pages`, `total`).
  2. Add compound MongoDB indexes in `backend/src/models/Listing.js`: `{ status: 1, mode: 1, category: 1, createdAt: -1 }` and `{ status: 1, seller: 1, createdAt: -1 }`.
  3. Migrate keyword search to MongoDB `$text` index (or MongoDB Atlas Search free tier for typo tolerance, e.g., `"ifone"` matching `"iPhone"`).
  4. Add a 60-day auto-archive policy (with email reminder to renew) so stale listings do not clutter the marketplace.

### 11. Moderation Admin Dashboard & Real Seller Verification
- **Current Gap:**
  - `POST /api/reports` saves scam/spam reports to MongoDB and `GET /api/reports` exists for `admin`/`moderator` roles, but there is **no Admin UI** to review reports, remove scam listings, or suspend bad actors.
  - `User.isVerified` has no self-serve verification workflow yet, while the UI displays `"Verified oBuy Member"` badges.
- **Action Plan:**
  1. Build a protected `/admin` panel (visible only to `role: 'admin' | 'moderator'`) to:
     - Review & resolve open `Report` tickets (`dismiss`, `remove listing`, `suspend user`).
     - Search users/listings and toggle `isSuspended` (blocking login, posting, and messaging).
     - Manually approve `isVerified` badges for vetted local merchants.
  2. Distinguish clearly between `"Email Verified"` (standard signup) and `"ID / Shop Verified"` (vetted merchant badge) so buyers are never misled.
  3. Consider adding Nigerian Phone OTP verification (e.g., Termii SMS/WhatsApp OTP) for sellers posting high-value electronics or vehicles (> ₦100,000).

---

## P2: Growth, Reliability & Cost Control

### 12. Dynamic WhatsApp / Social Link Previews (OpenGraph Meta Tags)
- **Current Gap:**
  - Because the frontend is a client-side Vite SPA, sharing `https://obuy.ng/listing/<id>` on WhatsApp, X, or Facebook renders only the generic homepage title with **no product image and no Naira price**.
- **Action Plan:**
  1. Add a lightweight Vercel Serverless / Edge middleware for `/listing/:id` and `/profile/:userId` that inspects the `User-Agent` header (`WhatsApp`, `facebookexternalhit`, `Twitterbot`, `TelegramBot`, `LinkedInBot`).
  2. For crawlers, fetch the listing metadata from the backend and return minimal HTML with dynamic `<meta property="og:title">`, `<meta property="og:description">` (price + city), and `<meta property="og:image">` (first listing photo). Normal browsers still receive the fast SPA instantly.

### 13. Eliminate Render Cold Starts & Prepare Socket.IO Scaling
- **Current Gap:**
  - Render's free tier spins down the Node backend after 15 minutes of inactivity, causing **30 to 60 second freezes** on the next user visit (and breaking initial Socket.IO connections).
  - Rate limiters (`express-rate-limit`) and Socket.IO rooms currently run in-memory on a single Node process.
- **Action Plan:**
  1. Move the production backend to an **always-on tier** (Render Starter ~\$7/month, Railway, or Fly.io) before marketing to real users.
  2. When scaling beyond 1 backend instance, back `express-rate-limit` and Socket.IO with **Upstash Redis** (generous free tier) via `rate-limit-redis` and `@socket.io/redis-adapter`.

### 14. AI API Cost Guardrails (Prevent Gemini Quota Drain)
- **Current Gap:**
  - `POST /api/ai/chat` in `backend/src/routes/aiRoutes.js` uses `optionalAuth`, meaning anonymous bots can spam the endpoint up to 30 requests per 15 minutes per IP and burn through your Gemini API budget/quota.
- **Action Plan:**
  1. Enforce a strict low quota for unauthenticated guests (e.g., 5 requests/hour) or require sign-in for AI chat.
  2. Track per-user daily AI call counts (e.g., 25 chat queries + 10 listing drafts per day) and cap `history` payload length + `maxOutputTokens` on the backend.
  3. Add graceful fallback responses when Gemini hits quota limits so the app never shows raw 500 errors.

### 15. In-Chat Photo Sharing, Message Read Receipts & Native Share Sheet
- **Current Gap:**
  - Buyers frequently ask sellers in chat for extra proof photos (e.g., iPhone battery health screenshot, generator serial plate, or flaw close-up), but chat currently supports only text, offers, meetup spots, and voice notes.
  - Messages do not yet show `✓` (sent) / `✓✓` (read) indicators.
- **Action Plan:**
  1. Add image attachment support (`messageType: 'image'`) inside `ChatPage.jsx` reusing the WebP upload pipeline (with lightbox tap-to-zoom).
  2. Emit a `messages_read` socket event when a user opens a conversation so the sender sees WhatsApp-style read checkmarks.
  3. Wire the Share button on `ListingDetailPage.jsx` to `navigator.share()` on mobile PWAs (falls back to clipboard copy on desktop).

---

## P3: UI Polish, Operations & Quality Assurance

### 16. Floating AI Assistant Button Ergonomics on Mobile
- **Current Gap:**
  - On narrow 360-390px screens, the floating purple AI button (`AIAssistantDrawer.jsx`) occasionally sits over active UI elements such as the Profile `"Details"` toggle or Chat safety/messages area unless manually dragged away.
- **Action Plan:**
  1. Auto-hide the floating bubble on `/messages` (or move the AI entry point into the top navbar / chat safety bar on mobile) so it never covers active conversation content.
  2. Persist the user's dragged corner position in `localStorage` and clamp it cleanly above `BottomNav` and below `Navbar`.

### 17. Image Pre-Upload Cropping & Client-Side Compression
- **Current Gap:**
  - On slower Nigerian 3G/4G mobile connections, uploading a raw 6-8 MB phone camera photo directly to the backend can take 10-20 seconds before Sharp compresses it server-side.
- **Action Plan:**
  1. Resize and compress images client-side (Canvas / `browser-image-compression`, max 1400px WebP/JPEG ~300 KB) **before** uploading to the API, making photo uploads 10x faster on mobile data.
  2. Add a simple 1:1 square crop preview when updating profile avatars.

### 18. Observability, Automated Backups & CI Safety Net
- **Current Gap:**
  - Errors are logged only to Render stdout; there is no error tracking, uptime alerting, or automated test pipeline.
- **Action Plan:**
  1. Add **Sentry** (free tier) to both frontend (`@sentry/react`) and backend (`@sentry/node`) to capture unhandled crashes and API 500s immediately.
  2. Configure an external uptime monitor (UptimeRobot / Better Stack, free tier) pinging `GET /api/health` every 5 minutes with email/WhatsApp alerts on downtime.
  3. Enable automated daily snapshots on MongoDB Atlas (M2/M10 when scaling, or scheduled `mongodump` to R2 while on M0).
  4. Add a GitHub Actions workflow (`.github/workflows/ci.yml`) that runs `npm run build` for frontend and lint/smoke tests for backend on every push to `main`.

### 19. Deferred Core Marketplace Routes (See `NEW_ROUTES_PLAN.md`)
- When ready for Phase 2 feature expansion, implement the planned routes already documented in [`NEW_ROUTES_PLAN.md`](./NEW_ROUTES_PLAN.md):
  - `/offers` (Central My Offers & Deals hub)
  - `/recent` (Recently Viewed listings)
  - `/settings` (Blocked Users management, Change Password, Default City/Radius, Delete Account)
  - `/safety` (Anti-scam checklist, fake bank alert defense, prohibited items)
  - `/saved-sellers` (Follow trusted local vendors)
  - Re-enable the mobile menu drawer trigger in `Navbar.jsx` once those routes are live.

---

## Pre-Launch Go-Live Checklist

- [ ] **Brand:** Custom `oBuy` SVG logo, brand color tokens, and regenerated PWA icons + splash assets
- [ ] **Storage:** Cloudflare R2 / Cloudinary connected; orphan media cleanup active; zero binary blobs left growing in MongoDB Atlas
- [ ] **Security:** Strict `ALLOWED_ORIGINS` CORS allowlist (no wildcard `*.vercel.app` / `*.onrender.com`), strong rotated `JWT_SECRET` & `JWT_REFRESH_SECRET`
- [ ] **Email:** Custom domain (`obuy.ng`) verified in Brevo with SPF + DKIM + DMARC; OTP tested to Gmail, Yahoo, and Outlook inbox (not Spam)
- [ ] **Voice & Push:** Voice notes playable on both Android Chrome and iPhone Safari; VAPID Web Push tested with PWA closed
- [ ] **Seller Controls:** Edit Listing (`/edit/:id`) live; `/market` pagination verified past 50 items
- [ ] **Trust & Legal:** `/terms`, `/privacy`, `/safety`, and `/admin` moderation queue live; foreign demo seed listings purged
- [ ] **Infra:** Backend running on always-on tier (zero cold starts); Sentry + `/api/health` uptime monitor active
- [ ] **PWA Refresh:** Remind early beta testers to uninstall/reinstall once after custom logo + `manifest.json` brand colors are finalized so Android regenerates the WebAPK system bar and launcher icon
