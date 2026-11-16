# Application Plan  
**Local Marketplace: Second-Hand, New Items & Services**  
Web + Mobile | Local Meetup / Off-Platform Payments Focus

---

## 1. Overview

This document outlines the plan for a peer-to-peer local marketplace where anyone can list **second-hand items**, **brand-new items**, or **services** (handwork such as barbers, photographers, nail techs, etc.).

The platform focuses exclusively on discovery, communication, and connection. All financial transactions and physical handovers or service appointments occur **off-platform** between users.

**Key Principle:**  
No money transactions happen on the website or app. The platform never holds, processes, or is responsible for funds. This eliminates liability for lost money, chargebacks, or failed deals.

Users can freely switch between the three main modes: Second-hand, New Items, and Services.

---

## 2. Core Concept

A modern, user-friendly alternative to Craigslist, Facebook Marketplace, and local service boards, with open listings from any user.

- Anyone can post (decentralized supply)
- Three main categories users can switch between:
  - **Second-hand** — used / pre-owned items
  - **New Items** — brand-new goods
  - **Services** — local skills and handwork (barbers, photographers, nail techs, tutors, cleaners, etc.)
- Primary transaction method: local meetup + cash or external payment apps (or arranged appointment for services)
- Platform provides: listings, search, messaging, location filters, and trust signals
- Platform does not provide: payment processing, escrow, shipping guarantees, or appointment booking/enforcement
- Built with MERN stack (MongoDB, Express, React, Node.js) for web and React Native for mobile

---

## 3. MVP Feature Set

### User Features
- Sign up / login (email or phone)
- Profile with location (city/region) and optional photo
- Switch between modes: Second-hand | New Items | Services
- Create listing:
  - Items (second-hand or new): photos, title, description, category, price, condition (for second-hand), location
  - Services: photos/portfolio, service type, description, price or price range, location, brief availability notes
- Edit, mark as sold/completed, or delete listings
- Browse and search: keyword, category/mode, price range, distance/radius
- Map or list view of nearby results
- In-app messaging between buyer/client and seller/provider
- Notifications for new messages and listing interest
- Save/favorite listings

### Platform Features
- Admin tools: report queue, basic moderation, user bans
- Clear terms stating the platform is not a party to any transaction or service agreement

### Deferred to Later Phases
- Ratings and reviews
- Shipping support or remote deals
- Promoted / boosted listings
- Advanced identity verification
- Service-specific features (calendars, recurring appointments, detailed portfolios)

---

## 4. User Flow

### For Items (Second-hand or New)
1. Seller chooses mode (Second-hand or New Items) and creates a listing with photos and details.
2. Buyer searches by keyword or browses, filtering by mode, category, and distance.
3. Buyer messages the seller inside the app.
4. They negotiate details and agree on a public meetup place and payment method.
5. They meet; buyer inspects the item and pays in cash or via external app.
6. Seller marks the listing as sold (optional).

### For Services
1. Provider lists their service with photos/portfolio, type, description, and pricing.
2. Client searches for the service type nearby.
3. Client messages the provider.
4. They arrange a meetup or appointment time and place, plus payment method.
5. Service is performed; client pays off-platform.
6. Provider marks the listing as completed or leaves it active (optional).

---

## 5. Location & Meetup Strategy

Location will always vary between users. The platform should support flexible proximity rather than rigid geographic walls. This applies to both item sales and services.

### Handling Location Variability
- Store a rough location on listings and profiles (city + neighborhood or approximate GeoJSON point).
- Allow users to set an adjustable search radius (e.g., 5 km, 15 km, 30 km, or whole city).
- Meetup or service place is agreed in chat by the users themselves — the platform does not dictate or schedule it.
- Optionally suggest safe public places (parks, malls, busy cafés, police station areas) near the midpoint or either party.
- Sellers/providers can note preferred meetup areas or how far they are willing to travel.

### Location Categories
Use location categories lightly as discovery tools, not as hard barriers.
- City/region as the primary filter.
- Neighborhood or district as a secondary filter.
- Optional local groups or boards that users can browse.
- Avoid exclusive categories that hide nearby listings outside a narrow zone.

### Recommended Approach
1. Primary model: location-based search with adjustable radius + in-chat meetup/appointment agreement.
2. Secondary model: optional location categories/groups for browsing.
3. Safety guidance in the UI: recommend public, well-lit places and inspect/agree before paying.
4. No platform-enforced or tracked meetups — keeps liability low.

---

## 6. Security & Authentication

Security should be designed in from the start rather than added later. Focus areas below cover authentication, account protection, and common application risks.

### Authentication & Account Security
- Strong password requirements (minimum length, complexity guidance; encourage passphrases)
- Secure password storage using bcrypt or Argon2 (never store plain text)
- Account lockout / progressive delay after repeated failed login attempts (e.g., temporary lock after 5–10 failures)
- Rate limiting on login, registration, and password-reset endpoints
- Email verification on signup (and optional phone verification)
- Secure password reset flow: time-limited, single-use tokens sent via email; invalidate all sessions on reset
- Session management:
  - Short-lived access tokens (JWT)
  - Longer-lived refresh tokens stored securely (httpOnly cookies on web where possible)
  - Ability to revoke sessions / logout from all devices
- Optional multi-factor authentication (2FA via authenticator app or SMS) as a post-MVP enhancement
- Secure logout that clears tokens on client and invalidates on server where practical

### Input, Upload & API Security
- Strict input validation and sanitization on all user-supplied data
- Protection against NoSQL injection, XSS, and CSRF
- File upload security:
  - Restrict to image types only
  - File size limits
  - Server-side type validation (not just extension)
  - Store outside web root and serve via controlled endpoints or CDN
- Rate limiting on sensitive actions (listing creation, messaging, search) to reduce spam and abuse
- HTTPS only; security headers (HSTS, Content-Security-Policy, X-Frame-Options, etc.)
- CORS configured tightly

### Data & Privacy
- Minimize stored personal data (especially precise location — use approximate or city-level by default)
- Encrypt sensitive data at rest where appropriate
- Clear privacy policy and terms of service
- User ability to delete account and associated data (with reasonable retention for legal/moderation needs)
- Avoid logging sensitive information (passwords, full tokens, precise location in plain text)

### Monitoring & Abuse Prevention
- Basic logging of authentication events and suspicious activity
- Spam and abuse detection (rapid listing creation, message flooding)
- Report and block functionality already planned
- Admin tools to review and act on reports quickly

### Mobile-Specific Considerations
- Secure local storage for tokens (use platform keychain/keystore where possible)
- Certificate pinning as an optional hardening step later
- Protect against common mobile risks (rooted/jailbroken detection optional, not blocking)

---

## 7. Technical Architecture (MERN)

### Frontend
- Web: React (or Next.js for better SEO later)
- Mobile: React Native (or Expo for faster development)
- Shared component logic where practical
- Mode switcher (Second-hand / New Items / Services) prominent in navigation and search

### Backend
- Node.js + Express
- MongoDB with geospatial indexes for proximity search
- Authentication: JWT + refresh tokens with proper revocation strategy
- Real-time chat: Socket.io (or simple polling initially)
- Rate limiting middleware (e.g., express-rate-limit)
- Validation library (e.g., Joi or Zod)

### Storage & Services
- Images: Cloudinary or AWS S3 (with proper access controls)
- Notifications: email/SMS service
- Maps: Mapbox or Google Maps

### Suggested Data Models
- Users: profile, location, contact preferences, password hash, verification status, failed login attempts, lockout timestamp
- Listings: 
  - Common fields: title, description, price/price range, location (GeoJSON), status, sellerId, mode (second-hand | new | service), images[]
  - Item-specific: condition, category
  - Service-specific: serviceType, portfolio notes, availability summary
- Messages: conversation threads tied to a listing
- Reports: moderation flags
- Refresh tokens / sessions (if stored server-side for revocation)

---

## 8. Trust & Safety

Even without handling payments, trust is critical for user adoption (especially for services).

- Safety guidelines: meet in public places where appropriate, inspect before paying (items), agree on scope and price before starting (services), never send money first for local deals
- Report buttons on listings and profiles
- Basic rate limiting and spam protection for new accounts
- Optional phone verification
- Prominent disclaimers that the platform is not a party to transactions or service agreements and is not responsible for lost funds or service outcomes

---

## 9. Other Important Considerations

These are frequently overlooked areas that improve reliability and user experience:

- **Error handling**: User-friendly messages that do not leak system details; proper HTTP status codes
- **Performance**: Caching for popular searches, image optimization, pagination on listings
- **Accessibility**: Basic keyboard navigation, sufficient contrast, screen-reader-friendly labels (especially important for web)
- **Offline / poor connectivity**: Graceful degradation on mobile (cache recent searches, queue messages)
- **Notifications**: Clear opt-in, easy unsubscribe, avoid over-notifying
- **Backup & recovery**: Regular database backups and tested restore process
- **Analytics**: Privacy-respecting analytics for understanding usage (avoid tracking sensitive actions)
- **Content moderation**: Clear community guidelines; process for removing illegal or harmful content
- **Legal basics**: Terms of Service, Privacy Policy, and disclaimers prominently linked; age restrictions if needed
- **Testing**: Unit tests for auth and critical flows; basic security testing (e.g., OWASP top risks relevant to the app)

---

## 10. Monetization Options (Post-MVP)

- Free core product
- Paid listing boosts / higher visibility (works for items and services)
- Featured placement for local businesses or frequent providers
- Optional premium accounts (extra photos, analytics, portfolio tools for services)
- Avoid transaction fees to preserve the no-liability model

---

## 11. Suggested Development Phases

### Phase 1 – Core MVP (4–8 weeks)
Listings (with mode support), search, messaging, basic profiles, image upload, core authentication (including rate limiting and lockout). Deploy web first, then mobile.

### Phase 2 – Polish & Trust
Improved search filters, saved searches, push notifications, report system, simple admin panel, better service listing fields, password reset polish, basic monitoring.

### Phase 3 – Growth Features
Ratings, promoted listings, better location tools, service-specific enhancements (if desired), optional 2FA, and optional open API or federation elements if stronger decentralization is wanted later.

---

## 12. Open Questions to Refine

- Preferred launch categories within each mode (e.g., furniture/electronics for items; barbers/photographers for services)?
- Geographic focus first (one city/region) or broader launch?
- Any open-source or self-hostable elements desired later?
- Must-have mobile features (camera-first listing flow, offline browsing, etc.)?
- Final preferred names: “New Items” vs alternatives; “Services” vs “Local Services” / “Handwork”?
- Priority of optional security features (2FA, advanced monitoring) for early versions?

---

*— End of Plan —*
