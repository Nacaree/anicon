# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Summary

AniCon is a platform for Cambodia's anime community — event ticketing, creator content, and community features. It is a full-stack monorepo: a **Next.js 16** frontend and a **Spring Boot 3.4 / Java 21** backend, backed by **Supabase (PostgreSQL)**.

Key reference docs:
- `docs/PLANNING2.md` — Auth flows, role system, entity designs, query patterns
- `schema.sql` — Full profiles/follows schema (run in Supabase SQL editor)
- `docs/ANICONNECT_TICKETING_SCHEMA_V2.sql` — Ticketing schema (Feature 1)
- `docs/ticketing_schema_design_guide.md` — Ticketing design rationale and payment flow
- `docs/TICKETING_BACKEND_PROGRESS.md` — Build session summary, TODOs, design decisions
- `backend/README.md` — Backend API documentation and setup

## Commands

### Frontend (`/frontend`)

```zsh
npm run dev       # Start dev server (localhost:3000)
npm run build     # Production build
npm run lint      # ESLint check
```

### Backend (`/backend`)

```zsh
./mvnw spring-boot:run                                       # Run the app (localhost:8080)
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev        # Run with dev profile (verbose errors)
./mvnw test                                                  # Run all tests
./mvnw test -Dtest=ClassName                                 # Run a single test class
./mvnw jooq-codegen:generate                                 # Regenerate JOOQ types after schema changes
./mvnw clean install                                         # Full build
```

To test PayWay flows locally without real payments, set `payway.mock-approved=true` in `application-dev.properties`. This makes `PayWayService` return a mock approved response instead of calling the real PayWay API.

## Architecture

### How the Stack Connects

```
Browser → Next.js (App Router) → Spring Boot REST API → Supabase (PostgreSQL)
                    ↕
              Supabase Auth (JWT)
```

- **Auth:** Supabase Auth issues JWTs. The frontend attaches them as `Authorization: Bearer <token>` headers. The backend's `JwtAuthenticationFilter` validates tokens using the Supabase JWT secret and sets a `SupabaseUserPrincipal` in the Spring Security context.
- **Direct DB access:** The frontend uses `@supabase/supabase-js` for auth state only. All other data goes through the Spring Boot API.
- **Profile creation:** A Supabase database trigger (`handle_new_user`) auto-creates a `profiles` row on signup — the backend does not create it manually.

### Frontend Architecture

- **Routing:** Next.js App Router. `(auth)/` is a route group for login/signup flows; `events/[id]/` is a dynamic route. `callback/route.js` handles the Supabase OAuth callback.
- **Middleware:** `src/proxy.js` handles route protection — it uses `@supabase/ssr` to read the session from cookies, redirects unauthenticated users to `/login`, and gates unverified emails to `/verify-email`. It exports a `proxy` named export (not `middleware`). Public routes: `/`, `/events`, auth pages, `/_next`, `/callback`.
- **State:** Three React contexts — `AuthContext` (session + user), `AuthGateContext` (modal prompting unauthenticated users), `SidebarContext` (visibility toggle).
- **API calls:** All authenticated requests go through `src/lib/api.js`, which injects the JWT automatically, wraps errors in an `ApiError` class, and retries on 5xx errors (3 attempts, 500ms backoff). Defaults to `http://localhost:8080`; override with `NEXT_PUBLIC_API_URL`. `normalizeEvent()` in `api.js` maps backend field names to frontend expectations (e.g. `eventDate`→`date`, `coverImageUrl`→`imageUrl`).
- **UI components:** Shadcn/ui (New York style) with Radix UI primitives, Lucide icons, and Tailwind CSS 4. Custom components live in `src/components/`; shadcn-managed primitives live in `src/components/ui/`.
- **Styling:** Tailwind CSS 4 (PostCSS-based, not config-file-based). Theme tokens are CSS custom properties in `globals.css` using OKLch color space. Dark mode uses the `.dark` class. Primary brand color is `#FF7927` (orange).
- **Performance:** React Compiler is enabled (`reactCompiler: true` in `next.config.mjs`). Heavy components use `next/dynamic` with skeleton loaders.
- **Mock data:** `src/data/mockEvents.js` provides all event data while the backend events API is not yet wired up in the frontend — this file needs to be replaced with real `eventApi` calls.
- **Testing:** No test framework is configured in the frontend.

### Backend Architecture

- **ORM strategy:** JPA/Hibernate for simple CRUD (profiles, follows, influencer_applications); JOOQ for complex queries (all ticketing tables). JOOQ types are generated into `com.anicon.backend.gen.jooq` via `./mvnw jooq-codegen:generate`.
- **Security:** Stateless JWT auth (no sessions). `JwtAuthenticationFilter` → `SupabaseJwtValidator` → `SupabaseUserPrincipal`. Rate limiting via Bucket4j (`RateLimitFilter`). Caching via Caffeine. CORS is hardcoded to `http://localhost:3000` in `SecurityConfig` — update this for production.
- **Layers:** `controller/` → `service/` → `repository/` (JPA) or JOOQ DSLContext.
- **Ticketing sub-package:** All ticketing code lives in `com.anicon.backend.ticketing` — `EventController`, `EventService`, `TicketController`, `TicketService`, `PayWayService`, and `dto/`. This package uses JOOQ exclusively (no JPA entities).

### Key API Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/health` | Public | Health check |
| `GET` | `/api/auth/me` | Required | Returns current user's profile |
| `GET` | `/api/profiles/{username}` | Public | Profile by username |
| `GET` | `/api/profiles/user/{userId}` | Public | Profile by UUID |
| `POST` | `/api/follows/{userId}` | Required | Follow a user |
| `DELETE` | `/api/follows/{userId}` | Required | Unfollow |
| `GET` | `/api/follows/{userId}/status` | Required | Check if following |
| `GET` | `/api/events` | Public | All upcoming events with tags |
| `GET` | `/api/events/{id}` | Public | Single event with tags |
| `POST` | `/api/events` | Required | Create event (role-gated) |
| `POST` | `/api/tickets/purchase/{eventId}` | Required | Initiate PayWay payment → returns checkoutUrl |
| `POST` | `/api/tickets/verify/{paywayTranId}` | Required | Verify payment → issue ticket |
| `POST` | `/api/tickets/rsvp/{eventId}` | Required | RSVP for free event |
| `GET` | `/api/tickets/my` | Required | User's non-cancelled tickets |

### Key Design Patterns

- **Money storage:** `transactions.amount` is `bigint` in **cents** (e.g. 500 = $5.00). `events.ticket_price` is `numeric(10,2)` in **dollars**. Never mix them — divide cents by 100 for display.
- **Atomic capacity enforcement:** Uses `UPDATE events SET current_attendance = current_attendance + 1 WHERE id = ? AND (max_capacity IS NULL OR current_attendance < max_capacity)`. If 0 rows affected → throw 409 CONFLICT (sold out). Prevents overselling without locking.
- **Deferred attendance increment (paid events):** `current_attendance` is only incremented after PayWay confirms payment — not on purchase initiation.
- **JOOQ multiset for tags:** Tags are loaded in one SQL round-trip (no N+1) using JOOQ's `multiset()` function.
- **Tag upsert:** Two-step — INSERT tag ON CONFLICT DO NOTHING, then SELECT tag ID by name.
- **Duplicate RSVP prevention:** The DB `UNIQUE (user_id, event_id)` constraint on `event_rsvps` rejects duplicates automatically — no Spring Boot check needed.

## Database

### Key Tables

| Table | Purpose |
|---|---|
| `auth.users` | Supabase-managed auth |
| `profiles` | User data; created by DB trigger on signup |
| `follows` | Follower graph |
| `influencer_applications` | Role upgrade requests |
| `events` | All events (free/paid, mini/normal) |
| `transactions` | PayWay payment records (paid events only) |
| `tickets` | Issued tickets (free or paid events) |
| `event_rsvps` | "I'm going" for free events |
| `tags` / `event_tags` | Tag definitions and many-to-many junction |

### Role System

Valid roles: `fan`, `influencer`, `creator`, `organizer`

Valid combinations only:
- `[fan]` — default
- `[influencer]` — approved fan
- `[creator]` — admin-assigned
- `[organizer]` — admin-assigned
- `[creator, organizer]` — the only multi-role combo

Event creation permissions (enforced in `EventService`, backed up by DB constraints):
- `influencer` → `mini_event` only, always free
- `creator` / `organizer` → all event types, free or paid

### Constraints & Conventions

- Username: max 20 chars, alphanumeric + underscore only
- `follower_count` / `following_count` are denormalized on `profiles` and updated atomically on follow/unfollow — do not recount from the `follows` table
- All timestamps use `timestamptz`
- Mini events must always be free (enforced at both DB level and Spring Boot service layer)

## Current Implementation Status

**Working:**
- Auth (Supabase JWT + Spring Security), Profiles, Follows
- Events (list, get, create with role-gating)
- RSVP for free events (unique constraint handles duplicates)
- Paid ticket purchase flow (PayWay integration via Unirest — real HTTP calls with HMAC-SHA512 signing)

**TODO:**
- Frontend — replace `mockEvents.js` with real `eventApi` calls
- Frontend — build PayWay checkout redirect flow (`/payment/verify` page)
- `GlobalExceptionHandler` — map duplicate RSVP DB constraint violation to 409 CONFLICT response
- Deferred (Month 2-3): Refund API, Close Transaction API, ticket types (standard/vip/early_bird)

## Important Rules

- All terminal commands must be **zsh compatible** (macOS)
- **Never read or process `.env` files**
- Respect all `.claudeignore` entries without exception

## Reference Docs
<!-- * this is for feature 1: Event Ticketing -->
- Database design: @docs/ticketing_schema_design_guide.md
- SQL schema: @docs/ANICONNECT_TICKETING_SCHEMA_V2.sql
