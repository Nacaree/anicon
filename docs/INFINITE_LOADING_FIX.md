# Infinite Loading — Root Cause & Final Fix

> Supersedes `EVENTS_INFINITE_LOADING_DEBUG.md`, which proposed a `Promise.race` timeout
> as the fix. That turned out to be wrong — this document covers the complete diagnosis
> and the fixes that were actually applied.

---

## Symptoms

| Page | Symptom |
|---|---|
| Profile dropdown | Skeleton never resolved (infinite loading) |
| Events page | Skeleton stuck for ~8 seconds, then resolved |
| Home page (events section) | Same ~8-second delay |
| My Tickets page | Skeleton never resolved (infinite loading) |

---

## The `navigator.locks` Deadlock (Original Root Cause)

Supabase JS uses the Web Locks API (`navigator.locks.request`) to serialize token
refresh operations — it acquires a named lock before calling the refresh endpoint
and holds it until the response returns.

This lock **deadlocks** in these browser states:

- DevTools is closed while a lock request was pending
- The page is restored from the back-forward cache (bfcache)
- Navigation immediately after an expired-token refresh starts

When the deadlock occurs, `supabase.auth.getSession()` waits indefinitely to acquire
the lock. Every API call in `api.js` calls `getSession()` inside `getAuthHeaders()`
before doing anything else — so the lock deadlock prevents the fetch from ever starting,
which means `setLoading(false)` is never called.

---

## The Wrong Fix (Previous Session)

The previous session added a `Promise.race` timeout to work around the deadlock:

```js
// WRONG — this caused new problems
const { data: { session } } = await Promise.race([
  supabase.auth.getSession(),
  new Promise((resolve) =>
    setTimeout(() => resolve({ data: { session: null } }), 8000)
  ),
]);
```

**Why it made things worse:**

1. Every API call — including public ones like `GET /api/events` — waited up to 8
   seconds before sending the request, causing the "~8 second delay" symptom.

2. When the timeout won the race (i.e. the lock was still held at 8s), the session
   resolved as `null`. In `AuthContext`, `setUser(null)` was then called, which reset
   the profile to the guest fallback — making it look like the user was logged out.

3. For legitimate slow token refreshes (real network latency to Supabase), the 8-second
   cap caused false failures that were indistinguishable from a deadlock.

---

## Fix 1 — Lock Bypass (`supabase.js`)

Replace `navigator.locks` entirely with a no-op that immediately calls the lock
callback. This eliminates the deadlock at the source.

**File:** `frontend/src/lib/supabase.js`

```js
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Bypass navigator.locks — prevents deadlock when DevTools is closed,
    // bfcache restores, or post-404 navigation. Safe for single-tab usage.
    // Trade-off: cross-tab session synchronisation is disabled.
    lock: async (_name, _acquireTimeout, fn) => fn(),
  },
});
```

**Trade-off:** Losing the lock means two tabs could each try to refresh the token
simultaneously. For this single-tab use case this is acceptable.

---

## Fix 2 — Remove the Timeout Wrappers

With Fix 1 in place the deadlock is gone. The `Promise.race` timeouts in `AuthContext`
and `api.js` were removed — they are no longer needed and actively cause the false
guest-fallback problem described above.

**Files changed:**
- `frontend/src/context/AuthContext.js` — `initAuth()` now calls `await supabase.auth.getSession()` directly
- `frontend/src/lib/api.js` — `getAuthHeaders()` now calls `await supabase.auth.getSession()` directly

---

## Fix 3 — `noAuth: true` for Public Endpoints (`api.js`)

Even without the timeout, `getSession()` is still called on every request including
public ones. On initial page load, `AuthContext` is also calling `getSession()` to
initialize the session. These two concurrent calls can contend, especially if the token
is expired and needs a network refresh.

For endpoints that don't require authentication there is no reason to call `getSession()`
at all. A `noAuth` flag was added to `request()`:

```js
async function request(endpoint, options = {}, retries = 3) {
  const { noAuth, ...fetchOptions } = options;
  const headers = noAuth
    ? { "Content-Type": "application/json" }
    : await getAuthHeaders();   // only called when auth is actually needed
  ...
}
```

Public endpoints were marked accordingly:

```js
// GET /api/events — public, no bearer token needed
export const eventApi = {
  listEvents: () => request("/api/events", { method: "GET", noAuth: true }),
  getEvent: (id) => request(`/api/events/${id}`, { method: "GET", noAuth: true }),
};

// GET /api/profiles/{username} and /api/profiles/user/{id} — public
export const profileApi = {
  getMyProfile: () => api.get("/api/profiles/me"),  // auth-required, unchanged
  getProfileByUsername: (username) =>
    request(`/api/profiles/${username}`, { method: "GET", noAuth: true }),
  getProfileById: (userId) =>
    request(`/api/profiles/user/${userId}`, { method: "GET", noAuth: true }),
};
```

---

## Fix 4 — Auth Guard on the Tickets Page (`tickets/page.js`)

The tickets endpoints (`GET /api/tickets/my`, `GET /api/tickets/my-rsvps`) require
a valid bearer token. The tickets page was starting its `useEffect` fetch immediately
on mount — before `AuthContext` had finished initializing the session.

The fix is to wait for `isLoading` (renamed `authLoading`) to become `false` before
starting the fetch. `isLoading` becomes `false` in `AuthContext.initAuth()` as soon as
`getSession()` resolves — before the profile fetch starts, so there is no extra wait.

```js
const { isLoading: authLoading } = useAuth();

useEffect(() => {
  if (authLoading) return; // getSession() hasn't resolved yet — wait
  Promise.all([ticketApi.myTickets(), ticketApi.myRsvps()])
    ...
    .finally(() => setLoading(false));
}, [authLoading]); // re-runs when authLoading transitions true → false
```

---

## Fix 5 — Module-Level Token Cache (`api.js` + `AuthContext.js`)

Even with the `authLoading` guard, the ticket fetch still calls `getAuthHeaders()`
which calls `getSession()`. Although the session should be cached in GoTrue's memory
at this point, in practice there was still a timing window where it could block.

The definitive fix: `AuthContext` writes the access token to a module-level variable
in `api.js` the moment `getSession()` resolves, and on every subsequent auth state
change. `getAuthHeaders()` reads from that cache first, completely bypassing
`getSession()` for the common case.

**`api.js`:**
```js
let _cachedAccessToken = null;

export function setCachedToken(token)  { _cachedAccessToken = token ?? null; }
export function clearCachedToken()     { _cachedAccessToken = null; }

async function getAuthHeaders() {
  if (_cachedAccessToken) {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${_cachedAccessToken}`,
    };
  }
  // Fallback: fires only before AuthContext has initialized (edge case)
  const { data: { session } } = await supabase.auth.getSession();
  ...
}
```

**`AuthContext.js`** — three call sites:

| Where | What |
|---|---|
| `initAuth()` — after `getSession()` resolves | `setCachedToken(session?.access_token)` |
| `onAuthStateChange` — `SIGNED_IN` / `TOKEN_REFRESHED` | `setCachedToken(session.access_token)` |
| `onAuthStateChange` — signed out / no session | `clearCachedToken()` |
| `signOut()` | `clearCachedToken()` |

`TOKEN_REFRESHED` is the critical one: Supabase silently rotates the access token
roughly every hour. Without updating the cache here, `getAuthHeaders()` would send
an expired token to the backend after the first rotation.

---

## Summary of All Files Changed

| File | Change |
|---|---|
| `src/lib/supabase.js` | Added `auth.lock` bypass |
| `src/context/AuthContext.js` | Removed timeout; added `setCachedToken` / `clearCachedToken` calls |
| `src/lib/api.js` | Removed timeout; added `noAuth` flag; added token cache with `setCachedToken` / `clearCachedToken` exports |
| `src/app/tickets/page.js` | Added `authLoading` guard on `useEffect` |

---

## End State — Request Flow

```
Page loads
  └─ AuthContext.initAuth()
       └─ supabase.auth.getSession()     ← one call, no contention
            └─ session resolved
                 ├─ setCachedToken(token) ← cache populated
                 └─ setIsLoading(false)  ← authLoading becomes false

Public page (events, event detail, public profiles)
  └─ eventApi.listEvents() / getEvent() / profileApi.getProfileById()
       └─ noAuth: true → no getSession() call → fetch fires immediately

Auth-required page (tickets)
  └─ useEffect guard: if (authLoading) return
       └─ waits until isLoading = false
            └─ ticketApi.myTickets()
                 └─ getAuthHeaders()
                      └─ _cachedAccessToken is set → returns immediately
                           └─ fetch fires with Authorization header

Token rotated (every ~1 hour)
  └─ onAuthStateChange(TOKEN_REFRESHED)
       └─ setCachedToken(newToken) ← cache updated, next request uses fresh token

Sign out
  └─ clearCachedToken() ← cache cleared, no stale token sent
```
