# RSVP Cancellation — Feature Documentation

## Overview

Users can now cancel their RSVP for free events. Previously, RSVPs were permanent once submitted. This feature adds a full cancel flow across the event detail page and the My Tickets page.

**Scope:** Free events only. Paid ticket refunds remain deferred to Month 2-3.

---

## Backend Changes

### New Endpoint

```
DELETE /api/tickets/rsvp/{eventId}
```

- **Auth:** Required (JWT bearer token)
- **Response:** `204 No Content` on success, `404 Not Found` if the RSVP doesn't exist
- **Ownership:** Enforced via `WHERE user_id = callerId` — users can only cancel their own RSVPs

### Files Modified

**`TicketController.java`** — new `cancelRsvp` endpoint:
```java
@DeleteMapping("/rsvp/{eventId}")
public ResponseEntity<Void> cancelRsvp(
        @PathVariable UUID eventId,
        @AuthenticationPrincipal SupabaseUserPrincipal principal)
```

**`TicketService.java`** — new `cancelRsvp(UUID callerId, UUID eventId)` method:
- Deletes the `event_rsvps` row for `(callerId, eventId)`
- Returns 404 if not found (also acts as the ownership check)
- Atomically decrements `events.current_attendance` using `GREATEST(current_attendance - 1, 0)` to guard against negative counts
- Both operations run inside a single JOOQ transaction

---

## Frontend Changes

### API (`frontend/src/lib/api.js`)

Added to `ticketApi`:
```js
cancelRsvp: (eventId) => api.delete(`/api/tickets/rsvp/${eventId}`),
```

---

### Event Detail Page (`EventTicketCard.js`)

**Before:** "You're Going! 🎉" disabled button + a small "Cancel RSVP" text link below it.

**After:**
- When `rsvpDone=true`, the main button becomes an active **"Cancel RSVP"** button (gray background, red hover) — no disabled state, no secondary link
- Clicking it opens a confirmation modal (Radix Dialog) with:
  - **"Keep my RSVP"** — outlined button, closes modal
  - **"Yes, cancel"** — red button, calls the API
- While the API call is in flight: "Cancelling…" text, modal can't be dismissed
- On success: modal closes, button reverts to "I'm Going", attendance decrements in cache

**New state:**
```js
const [cancelModalOpen, setCancelModalOpen] = useState(false);
const [cancelRsvpLoading, setCancelRsvpLoading] = useState(false);
```

---

### My Tickets Page (`tickets/page.js`)

**Before:** `window.confirm()` dialog on "Cancel" / "Cancel RSVP" buttons in `RsvpCard` and `RsvpRow`.

**After:** Same Radix Dialog modal pattern used in `EventTicketCard`:
- Small "Cancel" button (grid card) / "Cancel RSVP" button (list row) opens the modal
- Modal: "Keep my RSVP" + "Yes, cancel" buttons with loading state
- On success: card/row is removed from the list immediately via `setItems(prev => prev.filter(...))`
- Parent `handleCancelRsvp(rsvpId)` in `MyTicketsPage` handles the list update

Both `RsvpCard` and `RsvpRow` now use:
```js
const [cancelModalOpen, setCancelModalOpen] = useState(false);
const [cancelLoading, setCancelLoading] = useState(false);
```

---

## Data Flow

```
User clicks "Cancel RSVP"
  → cancelModalOpen = true → Dialog opens

User clicks "Yes, cancel"
  → cancelRsvpLoading = true
  → DELETE /api/tickets/rsvp/{eventId}
      → TicketService.cancelRsvp()
          → DELETE FROM event_rsvps WHERE user_id = ? AND event_id = ?
          → UPDATE events SET current_attendance = GREATEST(current_attendance - 1, 0)
  → On success:
      → Modal closes
      → rsvpDone = false (detail page) / item filtered from list (tickets page)
      → _eventCache attendance decremented (detail page only)
```

---

## Modal Component Pattern

All cancel modals use the existing shadcn/Radix Dialog pattern from checkout:

```jsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

<Dialog
  open={cancelModalOpen}
  onOpenChange={(open) => { if (!loading) setCancelModalOpen(open); }}
>
  <DialogContent className="max-w-sm">
    <DialogHeader>
      <DialogTitle className="text-xl font-bold">Cancel RSVP?</DialogTitle>
    </DialogHeader>
    <p className="text-sm text-gray-500">
      You'll be removed from the guest list for this event.
    </p>
    <div className="flex gap-3 mt-2">
      <button onClick={close} className="...outlined...">Keep my RSVP</button>
      <button onClick={handleCancel} className="...red...">Yes, cancel</button>
    </div>
  </DialogContent>
</Dialog>
```

- `onOpenChange` guard: modal cannot be dismissed while the API call is in flight
- Backdrop click and Escape key are also blocked during loading (via the same guard)
