# Event Detail Page — Performance Fix

## The Problem

Clicking an event card caused a ~400ms freeze/skeleton before the detail page appeared. Multiple attempts were made to fix it (SSR fetch, loading.js skeleton, Vercel proxy caching) but the delay persisted.

## Root Cause Investigation

The real cause was identified by looking at browser DevTools Network tab. There were **two completely different request types** that were being confused:

### 1. API data fetches (fast — not the problem)
- `GET https://anicon-production.up.railway.app/api/events/{id}` → **~7ms**
- `GET https://anicon-production.up.railway.app/api/profiles/user/{id}` → **~50-80ms**

These were fast. Railway responds quickly.

### 2. Next.js RSC payload fetch (slow — the actual problem)
- `GET https://anicon.online/events/{id}?_rsc=xxxxx` → **~400ms**

The `?_rsc=` suffix identifies this as Next.js's internal **React Server Component payload fetch** — not an API call. When you do client-side navigation in Next.js App Router, the browser fetches the server component's rendered output from Vercel before showing the new page. The 400ms was pure geographic latency: Cambodia → Vercel's US origin server → back.

## Why Previous Fixes Didn't Work

- **SSR data fetch in `page.js`**: Added a Railway fetch server-side, which blocked the RSC payload for 300–400ms (same wait, just moved server-side). Made things worse for navigations from the events list where `_eventCache` already had the data.
- **`loading.js` skeleton**: Made the delay *feel* better (showed a skeleton instead of a frozen page) but didn't reduce the 400ms. It was a UX band-aid, not a fix.
- **Vercel proxy routes (`/api/events/route.js`, `/api/events/[id]/route.js`)**: Added hoping Vercel's edge cache would absorb requests. In practice, the proxy added an extra hop (browser → Vercel → Railway → Vercel → browser) making event fetches *slower* (~400ms) than going to Railway directly (~7ms). Profile fetches went direct to Railway the whole time, which is why they were always fast.

## What Was Changed

### 1. Removed Vercel proxy routes (deleted files)
- `frontend/src/app/api/events/route.js` — deleted
- `frontend/src/app/api/events/[id]/route.js` — deleted

Both were dead overhead. Railway is fast; no proxy needed.

### 2. Removed `base: ""` from event API calls (`frontend/src/lib/api.js`)
`listEvents()` and `getEvent()` were using `base: ""` which resolves to the same origin as the page (`anicon.online`) — hitting the now-deleted proxy routes. Removed `base: ""` so both call Railway directly, same as profile fetches.

### 3. Removed SSR data fetch from `page.js`
`page.js` used to fetch the event from Railway server-side before sending HTML. This blocked the RSC payload for 300–400ms and negated the client-side `_eventCache`. Now `page.js` is a thin wrapper that just passes `id` to `EventDetailClient`.

### 4. Added `prefetch={true}` to event card links (`EventsPageCard.js`)
Default Next.js `<Link>` prefetch only fetches up to the nearest `loading.js` boundary. `prefetch={true}` fetches the **full RSC payload** while the card is visible in the viewport. Since `page.js` now has zero async work, the RSC payload is a tiny blob (~1KB). By the time the user clicks, it's already in the browser's cache → navigation is instant.

### 5. Deleted `loading.js`
Was added to show a skeleton instead of a frozen page during the RSC fetch. Now that the RSC payload is pre-fetched, there's nothing to wait for on click, so the skeleton never appears anyway.

### 6. Added `_eventCache` skip for "You May Also Like" (`EventDetailClient.js`)
Phase 2 was calling `eventApi.listEvents()` on every detail page visit to populate "You May Also Like". Added `getCachedEvents()` so it uses the already-warm in-memory cache when navigating from the events list — no network request needed.

## Result

| Scenario | Before | After |
|---|---|---|
| Click card from events list | ~400ms skeleton | Instant |
| Direct URL / hard refresh | ~7ms skeleton flash | ~7ms skeleton flash (unchanged) |
| "You May Also Like" on card click | Network fetch every time | Instant (uses `_eventCache`) |
| Event API fetch | Via Vercel proxy (~400ms cold) | Direct Railway (~7ms) |
