# Personalized Ticket Status on Event Detail Page

## What Was Built

The "Grab Your Tickets" card on the event detail page now shows personalized state based on what the user has already done:

| Scenario | What the user sees |
|---|---|
| Guest (not logged in) | Normal card — no change |
| Logged in, free event, not RSVPed | "I'm Going" button (default) |
| Logged in, free event, already RSVPed | "You're Going! 🎉" (disabled, pre-populated on load) |
| Logged in, paid event, no tickets | "Get Tickets" button (default) |
| Logged in, paid event, has 1+ tickets | Green badge: "You have X ticket(s) for this event" + "Get Tickets" button |

---

## Files Changed

| File | Change |
|---|---|
| `backend/.../ticketing/dto/EventTicketStatusResponse.java` | New DTO: `ticketCount` + `hasRsvp` |
| `backend/.../ticketing/TicketService.java` | Added `getEventStatus()` with null userId guard |
| `backend/.../ticketing/TicketController.java` | Added `GET /api/tickets/event-status/{eventId}`, nullable principal |
| `backend/.../config/SecurityConfig.java` | Permitted `GET /api/tickets/event-status/**` publicly |
| `frontend/src/lib/api.js` | Added `bestEffortAuth` request option + `ticketApi.eventStatus()` |
| `frontend/src/components/events/EventTicketCard.js` | Fetch on mount + badge JSX + animation |

---

## Backend: New Endpoint

```
GET /api/tickets/event-status/{eventId}
```

- **Public** (no auth required — listed in `SecurityConfig.permitAll()`)
- Optionally authenticated: if a JWT is present, returns real counts; if absent, returns zeros
- Two cheap DB queries (COUNT + EXISTS, no joins)
- Returns: `{ ticketCount: int, hasRsvp: boolean }`

The endpoint uses `@AuthenticationPrincipal(errorOnInvalidType = false)` so Spring passes `null` instead of throwing when no token is present. `TicketService.getEventStatus()` short-circuits immediately on null userId.

---

## Frontend: `bestEffortAuth` Pattern

The core problem was that fetching with normal auth required `getSession()` (~50–200ms) when `_cachedAccessToken` wasn't set yet, causing a slow fetch on direct page loads.

### Solution

Added a new `bestEffortAuth` option to `request()` in `api.js`:

```js
// In request():
} else if (bestEffortAuth) {
  // Use cached token synchronously — never call getSession().
  // If null, send no Authorization header; backend returns safe defaults.
  headers = _cachedAccessToken
    ? { "Content-Type": "application/json", Authorization: `Bearer ${_cachedAccessToken}` }
    : { "Content-Type": "application/json" };
}
```

### Behavior by Scenario

| How user arrived | Token cached? | Request sent with | Backend returns |
|---|---|---|---|
| Navigated from `/events` (token cached) | Yes | Bearer token | Real ticket count / hasRsvp |
| Direct URL / hard refresh (auth initializing) | No | No token | `{ticketCount: 0, hasRsvp: false}` |
| Direct URL, auth resolves → re-fire | Yes (now) | Bearer token | Real ticket count / hasRsvp |

### Re-fire on Auth Resolve

`EventTicketCard` re-fires the effect when `isAuthenticated` changes:

```js
useEffect(() => {
  if (!event?.id) return;
  ticketApi.eventStatus(event.id)
    .then((status) => {
      if (status.hasRsvp) setRsvpDone(true);
      if (status.ticketCount > 0) setTicketCount(status.ticketCount);
    })
    .catch(() => {})
    .finally(() => setStatusLoading(false));
}, [event?.id, isAuthenticated]); // re-fires once when isAuthenticated flips true
```

For users who navigated from the events list, `isAuthenticated` is already `true` on mount, so only one fetch fires. For direct-URL visitors, the effect fires twice: once immediately (returns zeros), then once after auth resolves (returns real data).

---

## UI: Badge Design

The ticket ownership badge uses a green pill / banner with a checkmark icon and a smooth entry animation:

```jsx
{!event.isFree && !statusLoading && ticketCount > 0 && (
  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-3 py-2.5 mb-3
    animate-in fade-in slide-in-from-top-1 duration-300">
    <svg ...checkmark... />
    <p className="text-sm text-green-700 font-medium">
      You have {ticketCount} ticket{ticketCount !== 1 ? "s" : ""} for this event
    </p>
  </div>
)}
```

**No skeleton** was used for the badge slot. The card renders at its natural height for users without tickets (no shrink). The badge fades in with `animate-in fade-in slide-in-from-top-1 duration-300` for users who do have tickets — smooth without layout shift.

`statusLoading` starts as `true` and flips to `false` in `.finally()` — this prevents the badge from briefly flashing at 0 before the real count arrives.

---

## Performance Notes

- Navigation from `/events` list: **instant** — token cached, single ~7ms fetch
- Direct URL: two fetches — first returns zeros immediately (~7ms), second returns real data once auth resolves (~50–200ms post-init)
- No `getSession()` is ever called in the event status fetch path
- The `isAuthenticated` dep causes at most **one re-fire** (false → true transition), never a loop
