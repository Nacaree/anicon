# Events Page — Infinite Loading Debug Session

## Symptom

- Events page gets stuck in infinite loading (skeleton never resolves) when navigating back to `/events` via client-side navigation (back button / `<Link>`)
- **Does not happen** when using constantly (fetch works fine)
- **Does not happen** when idle and then hard refreshing (Cmd+R)
- Happens intermittently after being idle for a while

## What Was Ruled Out

| Hypothesis | Result |
|---|---|
| Missing `finally()` block | ❌ — all fetches have `finally(() => setLoading(false))` |
| Retry logic infinite loop | ❌ — max 3 retries, bounded |
| Stale TCP keep-alive connection | ❌ — Tomcat property `server.tomcat.keep-alive-timeout` is NOT a valid Spring Boot property, was silently ignored |
| Backend crash / not running | ❌ — retry logic would catch ECONNREFUSED and resolve loading in ~1.5s |
| IntersectionObserver / `isVisible` stuck | ❌ — separate from loading state, only affects opacity animation |
| AuthContext infinite render loop | ❌ — `fetchProfile` is stable via `useCallback([])` |
| React Compiler memoization bug | ❌ — compiler doesn't change when `[]`-dep effects run |

## Root Cause

**The Supabase JS client uses an internal async lock for all session operations.**

When the background token refresh fires (runs periodically before JWT expiry), it holds this lock while making a network request to Supabase's auth server. If the user navigates back to `/events` at that exact moment, `getAuthHeaders()` calls `supabase.auth.getSession()`, which tries to acquire the same lock and **waits indefinitely**.

```
Background refresh fires
  → _acquireLock() held by refresh operation
    → Supabase makes network request (can be slow / stall)
      → getSession() waits for lock (timeout = -1, indefinite)
        → getAuthHeaders() hangs
          → fetch never starts
            → setLoading(false) never called
              → skeleton shown forever
```

**Why hard refresh fixes it:**
Hard refresh (Cmd+R) creates a fresh JavaScript context. The Supabase client is re-initialized with no in-progress refresh, so `getSession()` acquires the lock immediately.

**Why constant use works:**
Token is fresh, background refresh hasn't triggered, no lock contention.

**Why it's intermittent:**
Only happens when the background refresh fires AND the Supabase network request is slow — a narrow timing window.

## Relevant Code

**The hanging call** — [src/lib/api.js](../frontend/src/lib/api.js):
```javascript
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession(); // can hang indefinitely
  ...
}
```

`getSession()` is called before every API request. For public endpoints like `/api/events`, an auth header isn't even required — but the lock contention still blocks the entire fetch chain.

## Fix

Add a `Promise.race()` with a 3-second timeout in `getAuthHeaders()`. If `getSession()` takes too long (lock is held by background refresh), fall through with no auth header and proceed. Public endpoints like `/api/events` work without auth. Authenticated endpoints would get a 401, which is caught by the error handler.

```javascript
async function getAuthHeaders() {
  const sessionResult = await Promise.race([
    supabase.auth.getSession(),
    new Promise((resolve) =>
      setTimeout(() => resolve({ data: { session: null } }), 3000)
    ),
  ]);

  const session = sessionResult.data?.session;
  const headers = { "Content-Type": "application/json" };
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }
  return headers;
}
```

## Also Investigated

- `src/proxy.js` — middleware calls `supabase.auth.getUser()` (real network request) on every navigation. This is intentional for security but means every client-side navigation depends on Supabase responding. Not the cause of this bug but a general performance consideration.
- `server.tomcat.keep-alive-timeout` added to `application.properties` — **has no effect**, not a valid Spring Boot property. Should be removed or replaced with proper Tomcat configuration via `WebServerFactoryCustomizer` if needed.

## Status

- Root cause identified ✅
- Fix drafted ✅
- Fix not yet applied (pending user approval)
