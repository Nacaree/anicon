# Tickets Page Redesign — Session Notes

> **Date:** 2026-03-08
> **Branch:** `feature-ticket`
> **Status:** Complete — ready to test in prod

---

## What Was Done

### Problem
The `/tickets` page showed all paid tickets and free RSVPs in a single flat grid with no organization. Hard to scan, especially as events accumulate.

### Solution Implemented
**Option 4:** Upcoming/Past time tabs + All/Tickets/Free chip filters.

```
My Tickets
[Upcoming]  [Past]           ← sliding underline tab bar
[All]  [Tickets]  [Free]     ← chip filter pills
[ card ]  [ card ]  [ card ] ← filtered grid
```

---

## Changes Made

### `frontend/src/app/tickets/page.js` (only file changed)

**1. Two new state variables:**
```js
const [activeTab, setActiveTab] = useState("upcoming");   // "upcoming" | "past"
const [activeFilter, setActiveFilter] = useState("all");  // "all" | "ticket" | "rsvp"
```

**2. `displayedItems` derived from both states:**
```js
const today = new Date().toISOString().split("T")[0];
const displayedItems = items.filter((item) => {
  const isUpcoming = !item.eventDate || item.eventDate >= today;
  if (activeTab === "upcoming" && !isUpcoming) return false;
  if (activeTab === "past" && isUpcoming) return false;
  if (activeFilter === "ticket" && item.kind !== "ticket") return false;
  if (activeFilter === "rsvp" && item.kind !== "rsvp") return false;
  return true;
});
```
No extra API calls — pure client-side filtering on the already-fetched `items` array.

**3. Sliding tab bar:**
- Outer `div` has full-width `border-b` separator
- Inner `inline-flex` contains two `w-28` fixed-width buttons
- Absolutely-positioned `h-0.5 w-1/2` orange bar slides via `translate-x-full` on tab switch
- `transition-transform duration-300 ease-in-out`

**4. Chip filter row:**
- Three pill buttons: All / Tickets / Free
- Active = `bg-[#FF7927] text-white`, inactive = `bg-gray-100 text-gray-600`

**5. Grid animation:**
- `key={`${activeTab}-${activeFilter}`}` on the grid/empty-state container
- Forces React remount on every tab/filter change → re-triggers `animate-in fade-in slide-in-from-bottom-2 duration-200`

**6. Context-aware empty state:**
```js
const emptyMessage =
  activeFilter === "ticket" ? "No tickets found."
  : activeFilter === "rsvp" ? "No events found."
  : activeTab === "past"    ? "No past events."
  :                           "No upcoming events.";
```

**7. "Browse Events" button** — added `hover:scale-[1.03] active:scale-[0.98]` to match the rest of the app's button style.

---

## Other Small Fixes This Session

- `PaymentMethodModal.js` line 70: `General Admission` → `Ticket`
- `StripePaymentModal.js` line 75: `General Admission` → `Ticket`

---

## Testing the Past Tab

The DB has a constraint `event_date >= current_date` that prevents creating past events, but existing events can be backdated via SQL for testing:

```sql
-- Drop constraint temporarily
ALTER TABLE events DROP CONSTRAINT valid_date;

-- Set an event to last month
UPDATE events SET event_date = '2026-02-01' WHERE id = 'your-event-id';

-- Re-add constraint (only enforced on future inserts/updates)
ALTER TABLE events ADD CONSTRAINT valid_date CHECK (event_date >= current_date);
```

Find event IDs with:
```sql
SELECT id, title, event_date FROM events LIMIT 10;
```

---

## TODO / Deferred

- **Cancel RSVP** from the tickets page (needs `DELETE /api/tickets/rsvp/{eventId}` backend endpoint)
- **QR code display** — tap a ticket card to show a scannable QR
- **Past tab sort** — currently ascending; past events might feel more natural sorted descending (most recent first)
