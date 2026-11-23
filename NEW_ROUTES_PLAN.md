# oBuy Expansion Plan (Saved for Later): 5 New Marketplace Routes & Mobile Menu Hub

This plan documents the 5 high-value marketplace routes identified from auditing eBay and adapted for oBuy's peer-to-peer Nigerian marketplace, ready to implement when we resume route expansion.

> Note: `/categories` is intentionally omitted because `/market` and `/` already handle mode and category browsing.

---

## Routes to Build

| Priority | Route | Purpose |
| :--- | :--- | :--- |
| 1. High | `/offers` (**My Offers & Deals**) | Central hub of all active, countered, accepted, and declined price offers across conversations with inline Accept, Counter, and Decline actions. |
| 2. High | `/recent` (**Recently Viewed**) | Quick history of recently opened listings (localStorage for guests + synced `User.recentlyViewed` capped at 24 items for logged-in users). |
| 3. High | `/settings` (**Account & Privacy Settings**) | Dedicated screen to change password (`POST /api/auth/change-password`), manage & unblock Blocked Users (`GET /api/chat/blocked-users`, `POST /api/chat/unblock/:userId`), and set default city/radius preferences. |
| 4. Medium | `/saved-sellers` (**Saved Sellers**) | Follow trusted local vendors (`User.savedSellers` capped at 100, `POST /api/users/:id/follow`, `GET /api/users/me/saved-sellers`) and browse their latest active listings. |
| 5. Medium | `/safety` (**Safety & Help Center**) | Offline-capable local meetup guide, fake transfer alert verification checklist, category inspection guides, prohibited items policy, FAQ accordion, and real links replacing static Footer labels. |

---

## Backend Implementation Summary

1. **Offers (`GET /api/chat/offers`, `protect`)**:
   - Add compound index `{ messageType: 1, conversation: 1, createdAt: -1 }` on `backend/src/models/Message.js`.
   - Query offer messages across conversations where `req.user._id` is a participant (excluding blocked users), strip counterparty `email`, tag `direction: 'sent' | 'received'`, and reuse `PATCH /api/chat/messages/:id/offer`.
2. **Recently Viewed (`GET /api/users/me/recent`, `POST /api/users/me/recent/:listingId`, `DELETE /api/users/me/recent`)**:
   - Add bounded `recentlyViewed` (max 24 `{ listing, viewedAt }`) to `backend/src/models/User.js`.
   - Validate ObjectIds, deduplicate, and filter deleted/inactive listings gracefully.
3. **Saved Sellers (`GET /api/users/me/saved-sellers`, `POST /api/users/:id/follow`)**:
   - Add `savedSellers` (max 100) to `backend/src/models/User.js`, block self-follow, return public seller stats (no `email`) + latest 3 active listings.
   - Add Follow/Following button on public seller profiles (`ProfilePage.jsx`) and seller strips (`ListingDetailPage.jsx`).
4. **Account Settings (`POST /api/auth/change-password`, `protect`, `authLimiter`)**:
   - Verify current password via bcrypt, require >= 8 chars, hash and save new password, revoke other sessions' refresh tokens.

---

## Navigation & Frontend Standards

- Restore the Mobile **Menu** button (`flex lg:hidden`) in `Navbar.jsx` (keeping the Favorites heart out of the top bar) as a focused **More & Account Hub** for `/offers`, `/saved-sellers`, `/recent`, `/favorites`, `/settings`, `/safety`, Install App, and Log Out.
- Build all 5 pages with flat non-carded UI, floating `useToast()` notifications (zero `alert()`), idle route-chunk preloading in `App.jsx`, and Stale-While-Revalidate caches in `routeCache.js` (cleared on logout).
