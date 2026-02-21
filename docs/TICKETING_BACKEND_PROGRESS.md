# Ticketing Backend — Build Session Summary

> **Date:** 2026-02-21
> **Branch:** `feature-ticket`
> **Status:** Core event + ticket layer complete. PayWay integration stubbed.

---

## What Was Built

### Package: `com.anicon.backend.ticketing`

All ticketing code lives in its own package — no JPA entities or repositories. Uses JOOQ DSLContext directly throughout.

```
ticketing/
├── dto/
│   ├── CreateEventRequest.java     — POST body for creating an event (@Valid annotations)
│   ├── EventResponse.java          — Event data returned from API (includes tags list)
│   ├── PurchaseTicketRequest.java  — POST body for initiating payment (paymentMethod)
│   ├── PurchaseResponse.java       — Returned after purchase initiation (includes checkoutUrl)
│   ├── TicketResponse.java         — Issued ticket data (transactionId null for free events)
│   ├── TransactionResponse.java    — Payment record (amount in cents)
│   └── RsvpResponse.java           — RSVP confirmation for free events
├── EventService.java
├── EventController.java
├── PayWayService.java              — STUB (fill in real API calls)
├── TicketService.java
└── TicketController.java
```

---

## API Endpoints

### Events (public GET, auth required for POST)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/events` | No | List all upcoming events with tags |
| `GET` | `/api/events/{id}` | No | Get a single event with tags |
| `POST` | `/api/events` | Yes | Create an event (role-gated) |

### Tickets (all require auth)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/tickets/purchase/{eventId}` | Initiate PayWay payment for a paid event |
| `POST` | `/api/tickets/verify/{paywayTranId}` | Verify payment with PayWay, issue ticket |
| `POST` | `/api/tickets/rsvp/{eventId}` | RSVP for a free event |
| `GET` | `/api/tickets/my` | Get the caller's non-cancelled tickets |

---

## Key Design Decisions

### No JPA for ticketing tables
JOOQ DSLContext is used directly for all ticketing tables (`events`, `transactions`, `tickets`, `event_rsvps`, `tags`, `event_tags`). No `@Entity` classes or Spring Data repositories. The existing JPA setup (Profile, Follow) is left unchanged.

### Role permission check (EventService)
Enforced at the service layer before any DB writes:
- `fan` → 403, cannot create events
- `influencer` → `mini_event` only, must always be free
- `creator` / `organizer` → any event type, free or paid

The DB also enforces `mini_event_must_be_free` via a check constraint as a safety net.

### Atomic capacity enforcement
`current_attendance` is **never** derived from a `COUNT()`. It is incremented atomically using:
```sql
UPDATE events
SET current_attendance = current_attendance + 1
WHERE id = ?
  AND (max_capacity IS NULL OR current_attendance < max_capacity)
```
If `0` rows are updated → event is sold out → throw `409 CONFLICT`. This handles race conditions between concurrent buyers.

### `current_attendance` is only incremented on ticket issue / RSVP confirm
For paid events, attendance is **not** incremented when a purchase is initiated (to avoid phantom locks from abandoned checkouts). It is incremented only in `verifyAndIssueTicket()` after PayWay confirms success.

### Tag upsert (two-step)
```java
// 1. Insert tag if not exists
INSERT INTO tags (name) VALUES (?) ON CONFLICT (name) DO NOTHING;
// 2. Fetch tag ID by name (guaranteed to exist after step 1)
SELECT id FROM tags WHERE name = ?;
```

### JOOQ multiset for tags
Event queries use `multiset()` to load tags in one SQL round-trip — no N+1:
```java
multiset(
    selectDistinct(TAGS.NAME)
    .from(TAGS).join(EVENT_TAGS)...
    .where(EVENT_TAGS.EVENT_ID.eq(EVENTS.ID))
).as("tags").convertFrom(r -> r.map(Record1::value1))
```

### Money is stored in cents
`transactions.amount` is `bigint` (cents). `events.ticket_price` is `numeric(10,2)` (dollars).
Conversion: `ticketPrice.multiply(BigDecimal.valueOf(100)).longValue()`
Frontend divides by 100 to display.

---

## PayWay Integration (TODO)

`PayWayService.java` is a stub with two methods to fill in:

| Method | What it does |
|---|---|
| `initiatePayment(...)` | POST to PayWay Purchase API → returns `paywayTranId` + `checkoutUrl` |
| `verifyPayment(paywayTranId)` | POST to PayWay Check Transaction API → returns `true` if `payment_status_code == 0` |

The PayWay return URL is configured in `application.properties`:
```properties
payway.return-url=http://localhost:3000/payment/verify
```
Change this to the production frontend URL before going live.

---

## Files Modified (Outside `ticketing/`)

| File | Change |
|---|---|
| `SecurityConfig.java` | Added `GET /api/events` and `GET /api/events/**` as public (no auth required) |
| `application.properties` | Added `payway.return-url` config key |
| `CLAUDE.md` | Updated to cover full-stack architecture, added ticketing schema refs |

---

## Remaining Before Feature Is Complete

1. **PayWayService** — replace stubs with real HTTP calls to PayWay API
2. **GlobalExceptionHandler** — catch `DataIntegrityViolationException` for duplicate RSVPs → return `409 CONFLICT` with a user-friendly message
3. **Frontend** — connect event listing/detail pages to the real API (replace `mockEvents.js`)
4. **Frontend** — build the `POST /purchase` → redirect to PayWay → `POST /verify` flow
5. **Deferred (Month 2–3)** — Refund API, Close Transaction API, ticket types (`standard`/`vip`/`early_bird`)
