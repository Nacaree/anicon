import { supabase } from "./supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

// Module-level token cache — written by AuthContext immediately after getSession()
// resolves during auth initialization, and on every TOKEN_REFRESHED / SIGNED_IN event.
//
// This means authenticated API calls (e.g. ticket fetches) can attach the bearer
// token without calling getSession() themselves. Calling getSession() concurrently
// with AuthContext's own getSession() can block indefinitely; using the cached
// token sidesteps that entirely.
let _cachedAccessToken = null;

// Called by AuthContext after auth initializes and on every auth state change.
export function setCachedToken(token) {
  _cachedAccessToken = token ?? null;
}

// Called by AuthContext on sign-out.
export function clearCachedToken() {
  _cachedAccessToken = null;
}

async function getAuthHeaders() {
  // Fast path: use the token AuthContext already resolved.
  // By the time any auth-required page fires a request (after the authLoading
  // guard), AuthContext will have already called setCachedToken(), so this
  // branch is hit on virtually every authenticated request.
  if (_cachedAccessToken) {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${_cachedAccessToken}`,
    };
  }

  // Fallback: no token cached yet (e.g. the request fires before AuthContext
  // finishes initializing). getSession() should return quickly from the cookie
  // cache at this point; the lock bypass in supabase.js prevents any deadlock.
  const { data: { session } } = await supabase.auth.getSession();

  const headers = {
    "Content-Type": "application/json",
  };

  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  return headers;
}

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(endpoint, options = {}, retries = 3) {
  // noAuth: true skips getSession() entirely for public endpoints.
  // This is important because getSession() can block on initial page load
  // while AuthContext is also calling getSession() concurrently to initialize
  // the session from cookies / refresh an expired token. Public endpoints
  // (e.g. GET /api/events) don't need a bearer token, so there's no reason
  // to wait for auth initialization before sending the request.
  const { noAuth, bestEffortAuth, ...fetchOptions } = options;
  const baseUrl = API_URL;

  let headers;
  if (noAuth) {
    // Public endpoint — no token needed at all.
    headers = { "Content-Type": "application/json" };
  } else if (bestEffortAuth) {
    // Optionally-authenticated endpoint: use the cached token synchronously if available,
    // otherwise send no Authorization header (never call getSession()).
    // This lets the request fire instantly on page load without waiting for auth init.
    // The backend treats a missing token as a guest request and returns safe defaults.
    headers = _cachedAccessToken
      ? { "Content-Type": "application/json", Authorization: `Bearer ${_cachedAccessToken}` }
      : { "Content-Type": "application/json" };
  } else {
    headers = await getAuthHeaders();
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  const config = {
    ...fetchOptions,
    signal: controller.signal,
    headers: {
      ...headers,
      ...fetchOptions.headers,
    },
  };

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, config);
    clearTimeout(timeoutId);

    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    }

    if (!response.ok) {
      // Retry on server errors (5xx) — pass noAuth through so retries use the same auth settings.
      if (response.status >= 500 && retries > 0) {
        await wait(500);
        return request(endpoint, { ...fetchOptions, noAuth }, retries - 1);
      }

      throw new ApiError(
        data?.message || data?.error || "An error occurred",
        response.status,
        data,
      );
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    // Don't retry on timeout (AbortError) or explicit ApiError.
    if (retries > 0 && error.name !== "ApiError" && error.name !== "AbortError") {
      await wait(500);
      return request(endpoint, { ...fetchOptions, noAuth }, retries - 1);
    }
    throw error;
  }
}

export const api = {
  get: (endpoint) => request(endpoint, { method: "GET" }),

  post: (endpoint, body) =>
    request(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  put: (endpoint, body) =>
    request(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  patch: (endpoint, body) =>
    request(endpoint, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  delete: (endpoint) => request(endpoint, { method: "DELETE" }),
};

// Auth-specific API calls
export const authApi = {
  // Get current user info and profile (auto-creates profile if needed)
  getCurrentUser: () => api.get("/api/auth/me"),

  // Resend verification email (public endpoint)
  resendVerification: (email) =>
    api.post("/api/auth/resend-verification", { email }),

  // Send magic link (public endpoint)
  sendMagicLink: (email, redirectTo) =>
    api.post("/api/auth/magic-link", { email, redirectTo }),
};

// Profile API calls
export const profileApi = {
  // /api/profiles/me requires a valid bearer token (auth-required).
  // Uses getAuthHeaders() so the token is attached.
  getMyProfile: () => api.get("/api/profiles/me"),

  // /api/profiles/{username} and /api/profiles/user/{userId} are public endpoints
  // (anyone can view a profile without being logged in).
  // noAuth: true skips getSession() so these don't block on auth initialization —
  // same reason as eventApi below.
  getProfileByUsername: (username) =>
    request(`/api/profiles/${username}`, { method: "GET", noAuth: true }),
  // ! Depreciated
  // !might not get used
  getProfileById: (userId) =>
    request(`/api/profiles/user/${userId}`, { method: "GET", noAuth: true }),
};

// In-memory event cache populated by listEvents().
// When the user browses the events page, listEvents() already has every event in
// memory. Storing them here lets getEvent(id) return instantly on card click
// instead of making a round-trip to Railway (~300–800 ms in prod).
// Direct links to /events/:id still fetch normally — the cache is simply empty.
const _eventCache = new Map();

// Synchronous cache read exposed for the detail page to initialize React state
// without waiting for a Promise. This lets the page render with real event data
// on the very first paint (no skeleton flash) when coming from the events list.
export function getCachedEvent(id) {
  return _eventCache.get(String(id)) ?? null;
}

// Returns all cached events as an array, or null if the cache is empty.
// Used by EventDetailClient to skip the listEvents() network request when the
// user navigated from the events list (cache already warm).
export function getCachedEvents() {
  if (_eventCache.size === 0) return null;
  return [..._eventCache.values()];
}

// Applies a shallow patch to a single cached event.
// Used for optimistic updates after RSVP — updates the raw backend-shaped object
// in the cache before the next listEvents() poll confirms the real value.
// Patch fields must use backend field names (e.g. currentAttendance, not wantToGoCount)
// because the cache stores un-normalized API objects.
export function updateCachedEvent(id, patch) {
  const existing = _eventCache.get(String(id));
  if (!existing) return;
  _eventCache.set(String(id), { ...existing, ...patch });
}

// Event API calls — both endpoints are public (no auth required to browse events).
// noAuth: true bypasses getSession() so the request fires immediately on page load
// without waiting for auth initialization, which prevents infinite skeleton states.
// Both calls go directly to Railway (same as profile fetches) — Railway is already
// fast (~50-80ms RTT), and routing through the Vercel proxy adds an extra hop that
// makes requests slower (~400ms) rather than faster.
export const eventApi = {
  listEvents: async () => {
    const events = await request("/api/events", { method: "GET", noAuth: true });
    // Populate cache so subsequent getEvent(id) calls are instant.
    if (Array.isArray(events)) {
      events.forEach((e) => _eventCache.set(String(e.id), e));
    }
    return events;
  },
  getEvent: (id) => {
    // Return cached event immediately if available; otherwise fetch Railway directly.
    const cached = _eventCache.get(String(id));
    if (cached) return Promise.resolve(cached);
    return request(`/api/events/${id}`, { method: "GET", noAuth: true });
  },
};

// In-memory ticket/RSVP cache. Populated by the tickets page after its first
// fetch. Lets repeat visits render instantly without a network round-trip —
// same pattern as _eventCache above.
let _ticketCache = null;

// Returns the cached merged tickets+RSVPs array, or null if not yet populated.
export function getCachedTickets() {
  return _ticketCache;
}

// Called by the tickets page after merging tickets+RSVPs to populate the cache.
export function setCachedTickets(items) {
  _ticketCache = items;
}

// Clear cache when ticket state changes (purchase, RSVP, cancel) so the next
// visit to /tickets fetches fresh data.
export function invalidateTicketCache() {
  _ticketCache = null;
}

// Ticket API calls
export const ticketApi = {
  // Paid event: initiates PayWay payment, returns { checkoutUrl, paywayTranId, ... }
  purchase: (eventId, paymentMethod = "aba_pay", quantity = 1) =>
    api.post(`/api/tickets/purchase/${eventId}`, { paymentMethod, quantity }).then((res) => {
      invalidateTicketCache();
      return res;
    }),
  // Paid event: verifies PayWay payment and issues ticket
  verify: (paywayTranId) => api.post(`/api/tickets/verify/${paywayTranId}`).then((res) => {
    invalidateTicketCache();
    return res;
  }),
  // Free event: RSVPs the user
  rsvp: (eventId) => api.post(`/api/tickets/rsvp/${eventId}`).then((res) => {
    invalidateTicketCache();
    return res;
  }),
  // Returns all non-cancelled tickets for the current user
  myTickets: () => api.get("/api/tickets/my"),
  // Returns all RSVPs for the current user (free events)
  myRsvps: () => api.get("/api/tickets/my-rsvps"),
  // Cancel an abandoned Stripe checkout — marks the PaymentIntent cancelled on Stripe's side
  // and updates the transaction row in the DB. Called fire-and-forget; errors are swallowed.
  cancelStripe: (transactionId) => api.post(`/api/tickets/${transactionId}/cancel`).then((res) => {
    invalidateTicketCache();
    return res;
  }),
  // Cancel a free-event RSVP — deletes the event_rsvp row and decrements current_attendance.
  cancelRsvp: (eventId) => api.delete(`/api/tickets/rsvp/${eventId}`).then((res) => {
    invalidateTicketCache();
    return res;
  }),
  // Returns { ticketCount, hasRsvp } for the current user on a specific event.
  // Uses bestEffortAuth: sends the cached token if available (no getSession() call),
  // or no token if auth hasn't resolved yet. The backend handles both cases gracefully.
  // Called on event detail page mount — fires instantly without waiting for auth init.
  eventStatus: (eventId) => api.get(`/api/tickets/event-status/${eventId}`, { bestEffortAuth: true }),
};

// Adapts a raw EventResponse from the backend to the shape frontend components expect.
// The API returns eventDate/eventTime/coverImageUrl; components expect date/time/imageUrl etc.
function formatEventDate(isoDate) {
  if (!isoDate) return "";
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatEventTime(isoTime) {
  if (!isoTime) return "";
  const [h, m] = isoTime.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return m === 0
    ? `${hour} ${period}`
    : `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

export function normalizeEvent(event) {
  return {
    ...event,
    date: formatEventDate(event.eventDate),
    time: formatEventTime(event.eventTime),
    imageUrl: event.coverImageUrl || null,
    images: event.coverImageUrl ? [event.coverImageUrl] : [],
    thumbnails: event.coverImageUrl ? [event.coverImageUrl] : [],
    wantToGoCount: event.currentAttendance || 0,
    timeRange: formatEventTime(event.eventTime),
    dateRange: formatEventDate(event.eventDate),
  };
}

export { ApiError };
