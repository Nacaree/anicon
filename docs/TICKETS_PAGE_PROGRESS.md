# Tickets Page — Implementation Progress

> **Feature:** My Tickets page (`/tickets`)
> **Date:** 2026-02-24
> **Branch:** `feature-ticket`

---

## What Was Built

### Goal
Give users a page at `/tickets` where they can see all events they're attending — both paid tickets (from `tickets` table) and free event RSVPs (from `event_rsvps` table).

---

## Backend Changes

### 1. `TicketResponse.java` — Enriched with event fields

`GET /api/tickets/my` previously returned only raw ticket rows with no event detail (just `eventId`). Added 7 new fields populated via a JOIN:

```java
private String eventTitle;
private LocalDate eventDate;
private LocalTime eventTime;
private String eventLocation;
private String eventCoverImageUrl;
private Boolean isFree;
private BigDecimal ticketPrice;
```

### 2. `TicketService.getMyTickets()` — JOIN with events

Changed from a simple `selectFrom(TICKETS)` to a `select(...).from(TICKETS).join(EVENTS)` query so event details come back in one round-trip (no N+1).

```java
dsl.select(TICKETS.ID, ..., EVENTS.TITLE, EVENTS.EVENT_DATE, ...)
   .from(TICKETS)
   .join(EVENTS).on(TICKETS.EVENT_ID.eq(EVENTS.ID))
   .where(TICKETS.USER_ID.eq(userId))
   .and(TICKETS.STATUS.ne(TicketStatus.cancelled))
   .orderBy(TICKETS.CREATED_AT.desc())
```

### 3. `RsvpResponse.java` — Enriched with event fields

Same pattern as `TicketResponse` — added event detail fields so the frontend doesn't need extra calls:

```java
private String eventTitle;
private LocalDate eventDate;
private LocalTime eventTime;
private String eventLocation;
private String eventCoverImageUrl;
```

### 4. `TicketService.getMyRsvps()` — New method

```java
dsl.select(EVENT_RSVPS.ID, ..., EVENTS.TITLE, EVENTS.EVENT_DATE, ...)
   .from(EVENT_RSVPS)
   .join(EVENTS).on(EVENT_RSVPS.EVENT_ID.eq(EVENTS.ID))
   .where(EVENT_RSVPS.USER_ID.eq(userId))
   .orderBy(EVENTS.EVENT_DATE.asc())
```

### 5. `TicketController` — New endpoint

```
GET /api/tickets/my-rsvps
```

Returns `List<RsvpResponse>` (free event RSVPs only) for the authenticated user.

---

## Frontend Changes

### 1. `src/lib/api.js` — Added `myRsvps()`

```js
export const ticketApi = {
  myTickets: () => api.get("/api/tickets/my"),
  myRsvps:   () => api.get("/api/tickets/my-rsvps"),
  // ...
};
```

### 2. `src/app/tickets/page.js` — New page (created)

Route: `/tickets` — linked from the `/payment/success` "View My Tickets" button.

**Behaviour:**
- Fetches both endpoints in parallel with `Promise.all`
- Merges results, tags each item with `kind: "ticket"` or `kind: "rsvp"`
- Sorts the merged list by `eventDate` ascending (soonest event first)
- Renders a responsive 1→2→3-column grid of cards

**Card design differs by type:**

| | Paid Ticket | Free RSVP |
|---|---|---|
| Left badge | `$X.XX` | `Free RSVP` |
| Right badge | `Issued` / `Checked In` (green/blue) | `Going` (orange) |
| Footer | Copyable ticket code (`ANI-…`) | "You're on the guest list" note |

**Other states:**
- Loading: 3 skeleton pulse cards
- Empty: ticket icon + "Browse Events" CTA
- Error: red banner

---

## Why Two Endpoints (not one)?

Free events never produce a row in `tickets` — they write to `event_rsvps` instead. The schema intentionally separates paid and free attendance:

```
Paid event flow  → transactions + tickets
Free event flow  → event_rsvps (no transaction, no ticket)
```

A single `GET /api/tickets/my` can never return RSVPs. Two parallel fetches merged on the frontend is the minimal approach without schema changes.

---

## Key Files

| File | Change |
|---|---|
| `backend/.../dto/TicketResponse.java` | +7 event detail fields |
| `backend/.../dto/RsvpResponse.java` | +5 event detail fields |
| `backend/.../TicketService.java` | `getMyTickets()` uses JOIN; new `getMyRsvps()` |
| `backend/.../TicketController.java` | New `GET /api/tickets/my-rsvps` |
| `frontend/src/lib/api.js` | `ticketApi.myRsvps()` added |
| `frontend/src/app/tickets/page.js` | New page (created) |

---

## TODO / Deferred

- **Cancel RSVP button** — let users un-RSVP from the tickets page (needs `DELETE /api/tickets/rsvp/{eventId}`)
- **Past events** — currently all RSVPs show regardless of date; could add a "Past" tab that filters `eventDate < today`
- **QR code display** — show the ticket's QR code on tap for check-in scanning
