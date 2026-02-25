# AniCon — Ticketing Schema Design Guide

> **Stack:** Spring Boot · Next.js · Supabase (PostgreSQL)  
> **Currency:** USD only  
> **Scope:** Core ticket purchase flow — Refund & Close Transaction deferred to Month 2–3

---

## Overview of Tables

| Table | Purpose |
|---|---|
| `events` | All events (paid + free, mini + normal) |
| `transactions` | PayWay payment records (paid events only) |
| `tickets` | Issued after payment or for free events |
| `event_rsvps` | "I'm going" for free events |
| `tags` | Tag definitions (e.g. "naruto", "cosplay") |
| `event_tags` | Junction table linking events to tags |

---

## Table: `events`

### Columns

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `title` | varchar(255) | Event name |
| `location` | text | Venue or address |
| `event_date` | date | Date of the event |
| `event_time` | time | Start time |
| `organizer_id` | uuid | FK → `profiles.id` |
| `event_type` | enum | `mini_event`, `normal_event` |
| `is_free` | boolean | true = free, false = paid |
| `ticket_price` | numeric(10,2) | null if free |
| `max_capacity` | integer | null = no cap |
| `current_attendance` | integer | Denormalized live counter |
| `category` | varchar(50) | e.g. `convention`, `meetup`, `workshop` |
| `cover_image_url` | text | Banner image |
| `created_at` | timestamptz | Auto-set |
| `updated_at` | timestamptz | Auto-set |

### Constraints

```sql
-- Free events must have no price, paid events must have a price
constraint valid_free_event check (
  (is_free = true and ticket_price is null) or
  (is_free = false and ticket_price is not null)
),

-- Capacity must be positive if set
constraint valid_capacity check (max_capacity is null or max_capacity > 0),

-- Can't create events in the past
constraint valid_date check (event_date >= current_date)
```

### Who Can Host What

| Role | Mini Event | Normal Event | Free | Paid |
|---|---|---|---|---|
| `influencer` | ✅ | ❌ | ✅ only | ❌ |
| `organizer` | ✅ | ✅ | ✅ | ✅ |
| `creator` | ✅ | ✅ | ✅ | ✅ |

> Enforced at Spring Boot service layer, not just DB.

### Why `max_capacity` + `current_attendance`?

- `max_capacity` = hard cap (venue limit). Can be `null` for uncapped events.
- `current_attendance` = denormalized live counter incremented on every ticket issued or RSVP added.
- Enables "Only 12 spots left!" UI without expensive `COUNT()` queries every time.
- When `current_attendance >= max_capacity` → stop selling / accepting RSVPs.

---

## Table: `transactions`

Tracks PayWay payment interactions. **Only created for paid events.**

### Columns

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `event_id` | uuid | FK → `events.id` |
| `user_id` | uuid | FK → `profiles.id` — who is paying |
| `payway_tran_id` | varchar(100) | Unique ID from PayWay |
| `amount` | bigint | Stored in cents (e.g. 500 = $5.00) to avoid float issues |
| `payment_method` | enum | `card`, `aba_pay`, `khqr`, `wechat`, `alipay` |
| `payment_status` | enum | `pending`, `paid`, `failed`, `cancelled` |
| `payway_approval_code` | varchar(100) | Approval code (APV) from PayWay |
| `payway_response` | jsonb | Full PayWay response for audit trail |
| `created_at` | timestamptz | Auto-set |
| `paid_at` | timestamptz | Set when status becomes `paid` |
| `updated_at` | timestamptz | Auto-set |

> **Why `bigint` for amount?** Floating point arithmetic causes bugs with money. Store `500` and display `$5.00` — never store `5.00`.

---

## Table: `tickets`

Issued after a verified payment **or** directly for free events.

### Columns

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `event_id` | uuid | FK → `events.id` |
| `user_id` | uuid | FK → `profiles.id` — ticket owner |
| `transaction_id` | uuid | FK → `transactions.id` — **null for free events** |
| `ticket_code` | varchar(100) | Unique scannable code for check-in |
| `status` | enum | `issued`, `checked_in`, `cancelled` |
| `checked_in_at` | timestamptz | Set when organizer scans the code |
| `created_at` | timestamptz | Auto-set |

> **Why does `user_id` point to `profiles`?**  
> So you can query `SELECT * FROM tickets WHERE user_id = [logged in user]` to show "My Tickets". Without it, a ticket has no owner.

---

## Table: `event_rsvps`

Handles the **"I'm going"** button for **free events only**.

### Columns

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `event_id` | uuid | FK → `events.id` |
| `user_id` | uuid | FK → `profiles.id` — who RSVPed |
| `created_at` | timestamptz | Auto-set |

### Constraint

```sql
unique (user_id, event_id)
```

This means the **database itself rejects duplicate RSVPs** — if a user clicks "I'm going" twice due to a bug or double-tap, the second insert throws an error automatically. You don't need to write that check in Spring Boot.

> **Why does `user_id` point to `profiles`?**  
> Same reason as tickets — so you can query `SELECT * FROM event_rsvps WHERE user_id = [logged in user]` to show a user's upcoming free events.

---

## Tables: `tags` + `event_tags`

### Why Two Tables?

An event can have **many tags**, and a tag can belong to **many events**. This is a many-to-many relationship — it needs a junction table.

```
events ──< event_tags >── tags
```

### `tags`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `name` | varchar(50) | Unique, e.g. `naruto`, `cosplay`, `genshin` |

### `event_tags`

| Column | Type | Notes |
|---|---|---|
| `event_id` | uuid | FK → `events.id` |
| `tag_id` | uuid | FK → `tags.id` |

**Primary key:** `(event_id, tag_id)` — prevents the same tag being added to the same event twice.

> **Category vs Tags rule of thumb:**  
> - One value per event → column on `events` (category)  
> - Multiple values per event → junction table (tags)

---

## The 3-Step Payment Flow

```
1. PURCHASE
   User clicks "Buy Ticket"
   → Spring Boot creates TRANSACTION (status = 'pending')
   → Spring Boot calls PayWay Purchase API
   → PayWay returns checkout UI
   → User completes payment

2. VERIFY
   PayWay redirects to your return_url
   → Spring Boot calls PayWay Check Transaction API
   → PayWay confirms: payment_status_code = 0 (SUCCESS)

3. ISSUE TICKET
   → Spring Boot updates TRANSACTION (status = 'paid', paid_at = now)
   → Spring Boot inserts TICKET record with ticket_code
   → Increment events.current_attendance
   → Show "Your ticket is ready!"
```

---

## Free Event Flow

```
User clicks "I'm going"
→ Spring Boot checks: is_free = true
→ Insert into event_rsvps (user_id, event_id)
→ Increment events.current_attendance
→ Show "You're going!"
```

---

## Deferred Features (Month 2–3)

- **Refund API** — reverse `transaction.payment_status` to `cancelled`, update `ticket.status` to `cancelled`, decrement `current_attendance`
- **Close Transaction API** — for handling abandoned/pending transactions
- **`ticket_type`** — `standard`, `vip`, `early_bird` (useful when boosting system launches)
