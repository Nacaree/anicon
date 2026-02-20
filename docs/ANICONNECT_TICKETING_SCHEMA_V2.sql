-- ============================================
-- ANICONNECT TICKETING SCHEMA V2
-- ============================================
-- Changes from V1:
--   - Currency removed (USD only, hardcoded)
--   - Added category column to events
--   - Added tags + event_tags tables
--   - Updated role logic: influencer = mini-event only (always free)
--                         creator + organizer = all event types
--   - Cleaned up redundant constraints
--
-- Deferred to Month 2-3:
--   - Refund API logic
--   - Close Transaction logic
--   - ticket_type (standard/vip/early-bird)
-- ============================================

-- ============================================
-- ENUMS
-- ============================================

create type event_type as enum (
  'mini_event',     -- small gatherings, hosted by influencer/creator/organizer
  'normal_event'    -- larger events, hosted by creator/organizer only
);

create type payment_method as enum (
  'card',
  'aba_pay',
  'khqr',
  'wechat',
  'alipay'
);

create type payment_status as enum (
  'pending',    -- waiting for customer to complete payment
  'paid',       -- payment confirmed, ticket issued
  'failed',     -- payment failed, no ticket
  'cancelled'   -- customer cancelled or admin action
);

create type ticket_status as enum (
  'issued',       -- ticket created, not yet checked in
  'checked_in',   -- organizer scanned code, attendee verified
  'cancelled'     -- refunded or event cancelled
);

-- ============================================
-- EVENTS TABLE
-- ============================================

create table events (
  id              uuid primary key default gen_random_uuid(),

  -- Core info
  title           varchar(255) not null,
  location        text not null,
  event_date      date not null,
  event_time      time not null,

  -- Organizer (FK → your existing profiles table)
  organizer_id    uuid not null references profiles(id) on delete cascade,

  -- Event classification
  event_type      event_type not null,
  -- mini_event: influencer/creator/organizer, always free, small gatherings
  -- normal_event: creator/organizer only, can be free or paid

  category        varchar(50) not null,
  -- Single category per event
  -- Suggested values: 'convention', 'meetup', 'workshop', 'concert', 'competition', 'screening'

  -- Pricing (USD only)
  is_free         boolean not null default false,
  ticket_price    numeric(10,2),
  -- null when is_free = true
  -- stored as dollars (e.g. 5.00 = $5.00 USD)

  -- Capacity tracking
  max_capacity    integer,
  -- null = no cap (e.g. outdoor/online events)
  -- when current_attendance >= max_capacity → stop selling

  current_attendance integer not null default 0,
  -- Denormalized counter, incremented on every ticket issued or RSVP
  -- Avoids expensive COUNT() queries for "X people going" display

  -- Media
  cover_image_url text,

  -- Metadata
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),

  -- Constraints
  constraint valid_free_event check (
    (is_free = true  and ticket_price is null) or
    (is_free = false and ticket_price is not null)
  ),
  constraint valid_capacity check (
    max_capacity is null or max_capacity > 0
  ),
  constraint valid_date check (
    event_date >= current_date
  ),
  constraint valid_ticket_price check (
    ticket_price is null or ticket_price > 0
  ),
  constraint mini_event_must_be_free check (
    -- Mini events are always free (enforced at DB level as backup to Spring Boot)
    event_type != 'mini_event' or is_free = true
  )
);

-- Role permission logic (enforce in Spring Boot service layer):
--
--   influencer → mini_event only,   always free
--   creator    → mini_event + normal_event, free or paid
--   organizer  → mini_event + normal_event, free or paid

-- ============================================
-- TAGS TABLES
-- ============================================

-- Tag definitions
create table tags (
  id    uuid primary key default gen_random_uuid(),
  name  varchar(50) not null unique
  -- e.g. 'naruto', 'genshin', 'cosplay', 'free-entry', 'jujutsu-kaisen'
);

-- Junction table: many events <-> many tags
create table event_tags (
  event_id  uuid not null references events(id) on delete cascade,
  tag_id    uuid not null references tags(id) on delete cascade,

  primary key (event_id, tag_id)
  -- Prevents the same tag being added to the same event twice
);

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================
-- Paid events only. Free events do NOT have transactions.

create table transactions (
  id                    uuid primary key default gen_random_uuid(),

  -- References
  event_id              uuid not null references events(id) on delete cascade,
  user_id               uuid not null references profiles(id) on delete cascade,
  -- user_id tells you WHO paid → links to profiles table

  -- PayWay identifiers
  payway_tran_id        varchar(100) not null unique,
  -- Unique transaction ID from PayWay — used to verify and look up payments

  -- Payment details (USD only)
  amount                bigint not null,
  -- Stored in CENTS to avoid floating point bugs
  -- e.g. 500 = $5.00 USD, 1000 = $10.00 USD
  -- Display as: amount / 100 on frontend

  payment_method        payment_method,
  payment_status        payment_status not null default 'pending',

  -- PayWay response data
  payway_approval_code  varchar(100),
  -- Approval code (APV) returned by PayWay on success

  payway_response       jsonb,
  -- Full raw PayWay response — keep for debugging and audit trail

  -- Timestamps
  created_at            timestamptz default now(),
  paid_at               timestamptz,
  -- Set when payment_status changes to 'paid'
  updated_at            timestamptz default now(),

  constraint positive_amount check (amount > 0)
);

-- ============================================
-- TICKETS TABLE
-- ============================================
-- Issued after verified payment (paid events)
-- OR directly for free events (transaction_id = null)

create table tickets (
  id              uuid primary key default gen_random_uuid(),

  -- References
  event_id        uuid not null references events(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  -- user_id → so you can query "My Tickets" for the logged-in user

  transaction_id  uuid references transactions(id) on delete set null,
  -- null for free events (no payment involved)
  -- set for paid events after PayWay confirms payment

  -- Check-in
  ticket_code     varchar(100) not null unique,
  -- Unique scannable code for event entry
  -- Suggested format: 'ANI-{short_event_id}-{random}-{short_user_id}'

  status          ticket_status not null default 'issued',
  checked_in_at   timestamptz,
  -- Set when organizer scans the ticket

  -- Metadata
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================
-- EVENT RSVPS TABLE
-- ============================================
-- "I'm going" button for FREE EVENTS ONLY.
-- Paid events use tickets instead.

create table event_rsvps (
  id          uuid primary key default gen_random_uuid(),

  -- References
  user_id     uuid not null references profiles(id) on delete cascade,
  -- user_id → so you can query "My Upcoming Free Events" for logged-in user

  event_id    uuid not null references events(id) on delete cascade,

  -- Metadata
  created_at  timestamptz default now(),

  -- One RSVP per user per event
  -- Database auto-rejects duplicates (double-tap, bugs, etc.)
  constraint unique_rsvp unique (user_id, event_id)
);

-- ============================================
-- INDEXES
-- ============================================

-- Events
create index idx_events_organizer    on events(organizer_id);
create index idx_events_date         on events(event_date);
create index idx_events_type         on events(event_type);
create index idx_events_category     on events(category);
create index idx_events_is_free      on events(is_free);

-- Tags
create index idx_event_tags_event    on event_tags(event_id);
create index idx_event_tags_tag      on event_tags(tag_id);

-- Transactions
create index idx_transactions_user          on transactions(user_id);
create index idx_transactions_event         on transactions(event_id);
create index idx_transactions_status        on transactions(payment_status);
create index idx_transactions_payway_tran   on transactions(payway_tran_id);
-- ^ CRITICAL: PayWay verification queries hit this constantly

-- Tickets
create index idx_tickets_user        on tickets(user_id);
create index idx_tickets_event       on tickets(event_id);
create index idx_tickets_code        on tickets(ticket_code);

-- RSVPs
create index idx_rsvps_user          on event_rsvps(user_id);
create index idx_rsvps_event         on event_rsvps(event_id);

-- ============================================
-- SAMPLE QUERIES
-- ============================================

-- Get all upcoming events with category and tags
-- SELECT e.*, array_agg(t.name) as tags
-- FROM events e
-- LEFT JOIN event_tags et ON et.event_id = e.id
-- LEFT JOIN tags t ON t.id = et.tag_id
-- WHERE e.event_date >= current_date
-- GROUP BY e.id;

-- Get logged-in user's tickets
-- SELECT tk.*, e.title, e.event_date
-- FROM tickets tk
-- JOIN events e ON e.id = tk.event_id
-- WHERE tk.user_id = '[user_id]'
--   AND tk.status != 'cancelled';

-- Get logged-in user's free event RSVPs
-- SELECT er.*, e.title, e.event_date
-- FROM event_rsvps er
-- JOIN events e ON e.id = er.event_id
-- WHERE er.user_id = '[user_id]'
--   AND e.event_date >= current_date;

-- Check if event is sold out
-- SELECT
--   max_capacity,
--   current_attendance,
--   (max_capacity IS NOT NULL AND current_attendance >= max_capacity) as is_sold_out
-- FROM events
-- WHERE id = '[event_id]';

-- Verify a PayWay transaction
-- SELECT * FROM transactions
-- WHERE payway_tran_id = '[payway_tran_id]'
--   AND payment_status = 'paid';

-- ============================================
-- DEFERRED FEATURES (Month 2-3)
-- ============================================

-- REFUND SUPPORT:
-- ALTER TABLE transactions ADD COLUMN refund_requested_at timestamptz;
-- ALTER TABLE transactions ADD COLUMN refund_approved_at  timestamptz;
-- ALTER TABLE transactions ADD COLUMN refund_amount       bigint;
-- ALTER TABLE transactions ADD COLUMN payway_refund_id    varchar(100);

-- CLOSE TRANSACTION SUPPORT:
-- ALTER TABLE transactions ADD COLUMN closed_at       timestamptz;
-- ALTER TABLE transactions ADD COLUMN closure_reason  text;

-- TICKET TYPES (for boosting system):
-- ALTER TABLE tickets ADD COLUMN ticket_type varchar(50) default 'standard';
-- values: 'standard', 'vip', 'early_bird'
