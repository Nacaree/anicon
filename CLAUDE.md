# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Summary

AniCon is a platform for Cambodia's anime community — event ticketing, creator content, and community features. It is a full-stack monorepo: a **Next.js 16** frontend and a **Spring Boot 3.4 / Java 21** backend, backed by **Supabase (PostgreSQL)**.

Key reference docs:
- `docs/PLANNING2.md` — Auth flows, role system, entity designs, query patterns
- `schema.sql` — Full profiles/follows schema (run in Supabase SQL editor)
- `docs/ANICONNECT_TICKETING_SCHEMA_V2.sql` — Ticketing schema (Feature 1)
- `docs/ticketing_schema_design_guide.md` — Ticketing design rationale and payment flow
- `docs/TICKETING_BACKEND_PROGRESS.md` — Build session summary (partially stale: both PayWay and Stripe are fully implemented, not stubs)
- `docs/DEPLOYMENT_GUIDE.md` — Railway + Vercel hosting setup, env vars, known build issues
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
- **Middleware:** `src/proxy.js` handles route protection — it uses `@supabase/ssr` to read the session from cookies, redirects unauthenticated users to `/login`, and gates unverified emails to `/verify-email`. It exports a `proxy` named export (not `middleware`). Public routes: `/`, `/events`, `/login`, `/signup`, `/verify-email`, `/forgot-password`, `/reset-password`, `/callback`, `/_next`.
- **State:** Three React contexts — `AuthContext` (session + user), `AuthGateContext` (modal prompting unauthenticated users), `SidebarContext` (visibility toggle). Use the `useAuth()` hook to access `AuthContext`; it exposes: `user`, `profile`, `isLoading`, `isAuthenticated`, `emailVerified`, `signUp`, `signIn`, `signInWithMagicLink`, `signOut`, `resetPassword`, `updatePassword`, `refreshSession`, `fetchProfile`. Note: Supabase does not return an error for duplicate emails on signup — detect it by checking `authData.user?.identities?.length === 0`.
- **API calls:** All authenticated requests go through `src/lib/api.js`, which injects the JWT automatically, wraps errors in an `ApiError` class, and retries on 5xx errors (3 attempts, 500ms backoff). Defaults to `http://localhost:8080`; override with `NEXT_PUBLIC_API_URL`. `normalizeEvent()` in `api.js` maps backend field names to frontend expectations: `eventDate`→`date`, `eventTime`→`time`, `coverImageUrl`→`imageUrl`/`images`/`thumbnails`, `currentAttendance`→`wantToGoCount`, and also adds `timeRange`/`dateRange` aliases. Pass `noAuth: true` in the options object to skip the token fetch on public endpoints (avoids unnecessary `getSession()` calls).
- **Event cache:** `api.js` maintains a module-level `_eventCache` (Map). `eventApi.listEvents()` populates it; `eventApi.getEvent(id)` hits the cache first and only fetches Railway if the cache is empty (e.g. on a direct link to `/events/:id`). `getCachedEvent(id)` and `getCachedEvents()` are exported for synchronous reads — the event detail page uses these to render with real data on first paint, avoiding a skeleton flash when the user navigated from the events list.
- **Token caching:** `api.js` maintains a `_cachedAccessToken` updated by `AuthContext`. This avoids concurrent `getSession()` calls that would deadlock via Supabase's `navigator.locks`. Do not call `supabase.auth.getSession()` directly inside page components — use the cached token path through `api.js` or read from `AuthContext`.
- **UI components:** Shadcn/ui (New York style) with Radix UI primitives, Lucide icons, and Tailwind CSS 4. Custom components live in `src/components/`; shadcn-managed primitives live in `src/components/ui/`.
- **Styling:** Tailwind CSS 4 (PostCSS-based, not config-file-based). Theme tokens are CSS custom properties in `globals.css` using OKLch color space. Dark mode uses the `.dark` class. Primary brand color is `#FF7927` (orange).
- **Performance:** React Compiler is enabled (`reactCompiler: true` in `next.config.mjs`). Heavy components use `next/dynamic` with skeleton loaders. Event cards use `<Link prefetch={true}>` so the RSC payload for each detail page is pre-fetched while cards are visible — navigation is instant with no skeleton. Do not add a `loading.js` to `app/events/[id]/` — it was deliberately removed because `prefetch={true}` eliminates the RSC wait that made it necessary.
- **Mock data:** `src/data/mockEvents.js` exists but is **deprecated and unused** — `app/events/page.js` already calls `eventApi.listEvents()` with the real backend API.
- **Testing:** No test framework is configured in the frontend.

### Backend Architecture

- **ORM strategy:** JPA/Hibernate for simple CRUD (profiles, follows, influencer_applications); JOOQ for complex queries (all ticketing tables). JOOQ types live in `com.anicon.backend.gen.jooq` and are **committed to git** (not gitignored) so Railway CI builds don't need a live DB connection. To regenerate after schema changes: run `./mvnw jooq-codegen:generate` locally with a real DB, then commit the output. The build flag `-Djooq.codegen.skip=true` is set in `Dockerfile` to skip codegen in CI.
- **Security:** Stateless JWT auth (no sessions). `JwtAuthenticationFilter` → `SupabaseJwtValidator` → `SupabaseUserPrincipal`. Rate limiting via Bucket4j (`RateLimitFilter`). Caching via Caffeine. CORS origins are read from the `CORS_ALLOWED_ORIGINS` env var (comma-separated) in `SecurityConfig` — set this to `http://localhost:3000` locally and `https://anicon.online` in production.
- **Layers:** `controller/` → `service/` → `repository/` (JPA) or JOOQ DSLContext.
- **Ticketing sub-package:** All ticketing code lives in `com.anicon.backend.ticketing` — `EventController`, `EventService`, `TicketController`, `TicketService`, `PayWayService`, `StripeService`, `StripeWebhookController`, and `dto/`. This package uses JOOQ exclusively (no JPA entities).

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
| `POST` | `/api/tickets/purchase/{eventId}` | Required | Initiate payment → routes to PayWay or Stripe based on `paymentMethod` body field |
| `POST` | `/api/tickets/verify/{paywayTranId}` | Required | Verify PayWay payment → issue ticket |
| `POST` | `/api/tickets/rsvp/{eventId}` | Required | RSVP for free event |
| `GET` | `/api/tickets/my` | Required | User's non-cancelled tickets |
| `GET` | `/api/tickets/my-rsvps` | Required | User's free event RSVPs |
| `POST` | `/api/stripe/webhook` | Public (HMAC) | Stripe webhook — issues ticket on `payment_intent.succeeded` |

### Key Design Patterns

- **Money storage:** `transactions.amount` is `bigint` in **cents** (e.g. 500 = $5.00). `events.ticket_price` is `numeric(10,2)` in **dollars**. Never mix them — divide cents by 100 for display.
- **Atomic capacity enforcement:** Uses `UPDATE events SET current_attendance = current_attendance + 1 WHERE id = ? AND (max_capacity IS NULL OR current_attendance < max_capacity)`. If 0 rows affected → throw 409 CONFLICT (sold out). Prevents overselling without locking.
- **Deferred attendance increment (paid events):** `current_attendance` is only incremented after payment is confirmed — not on initiation. PayWay: confirmed in `verifyAndIssueTicket()`. Stripe: confirmed in `handleStripePaymentSucceeded()` (called by webhook).
- **Payment provider routing:** `TicketService.initiatePurchase()` routes to `StripeService` when `paymentMethod == "card"`, and to `PayWayService` for all other values (`aba_pay`, `khqr`, `wechat`, `alipay`). Both providers write to the same `transactions` table with a `payment_provider` column ("stripe" or "payway"). The `PurchaseResponse` includes `paymentProvider` + either `stripeClientSecret` (Stripe) or `checkoutUrl` + `paywayTranId` + `qrImage` + `qrString` + `abapayDeeplink` (PayWay) — check `paymentProvider` on the frontend before deciding which field to use.
- **Dual payment UI flow:** PayWay (`aba_pay`, `khqr`, `wechat`, `alipay`) redirects the user to an external checkout URL; the frontend's `payment/checkout/` and `payment/verify/` pages handle the return flow, with state (QR image, tran ID, amount) passed via `sessionStorage`. Stripe (`card`) stays on-site: `StripePaymentModal` uses Stripe Elements, the backend returns a `stripeClientSecret`, and the ticket is issued asynchronously via webhook — no verify page needed.
- **Payment state between pages:** PayWay checkout/verify pages pass state via `sessionStorage`, not URL params. Both `payment/verify/` and `payment/success/` use `useSearchParams()` wrapped in `<Suspense>` — required by Next.js App Router; omitting it causes a build error.
- **JOOQ multiset for tags:** Tags are loaded in one SQL round-trip (no N+1) using JOOQ's `multiset()` function.
- **Tag upsert:** Two-step — INSERT tag ON CONFLICT DO NOTHING, then SELECT tag ID by name.
- **Duplicate RSVP prevention:** The DB `UNIQUE (user_id, event_id)` constraint on `event_rsvps` rejects duplicates; `GlobalExceptionHandler` maps the resulting `DataIntegrityViolationException` to 409 CONFLICT.

## Database

### Key Tables

| Table | Purpose |
|---|---|
| `auth.users` | Supabase-managed auth |
| `profiles` | User data; created by DB trigger on signup |
| `follows` | Follower graph |
| `influencer_applications` | Role upgrade requests |
| `events` | All events (free/paid, mini/normal) |
| `transactions` | Payment records (paid events only; covers both PayWay and Stripe). Note: the V2 SQL schema file is incomplete — the live table has additional columns added post-V2: `payment_provider varchar(50)`, `stripe_payment_intent_id`, `stripe_charge_id`, `stripe_response jsonb`. |
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

## Deployment

- **Frontend:** Vercel, auto-deploys from `main` branch → `https://anicon.online`
- **Backend:** Railway, auto-deploys from `main` branch → `https://anicon-production.up.railway.app`
- **Workflow:** develop on feature branches → merge to `main` → both services auto-deploy
- **Key env vars:** `NEXT_PUBLIC_API_URL` on Vercel, `CORS_ALLOWED_ORIGINS` + `PAYWAY_RETURN_URL` on Railway

See `docs/DEPLOYMENT_GUIDE.md` for full env var list, Stripe webhook setup, and build troubleshooting.

## Current Implementation Status

**Working:**
- Auth (Supabase JWT + Spring Security), Profiles, Follows
- Events (list, get, create with role-gating)
- RSVP for free events (unique constraint handles duplicates)
- Paid ticket purchase flow: PayWay (Unirest, HMAC-SHA512 signing) + Stripe (`StripeService`, `StripeWebhookController`)
- Payment UI pages: `app/payment/checkout/`, `app/payment/verify/`, `app/payment/success/`

**TODO (Deferred to Month 2-3):**
- Refund API, Close Transaction API, ticket types (standard/vip/early_bird)

## Event Detail Page — Performance Architecture

Event API calls (`GET /api/events`, `GET /api/events/{id}`) go **directly to Railway** — there is no Vercel proxy in the path. This is intentional: Railway responds in ~7ms and a proxy adds latency, not removes it. See `docs/DETAIL_PAGE_PERF_FIX.md` for the full investigation.

The `app/events/[id]/page.js` server component is intentionally thin (no data fetch). The event detail flow:
1. User is on `/events` → `listEvents()` populates the in-memory `_eventCache`
2. Event cards render with `<Link prefetch={true}>` → Next.js pre-fetches each RSC payload in the background
3. User clicks → RSC payload already cached → `EventDetailClient` mounts → reads event from `_eventCache` → renders instantly with zero network calls

**Important for event creation:** `GET /api/events` returns `Cache-Control: public, max-age=60`. Users who just loaded the events page will see a cached list for up to 60 seconds. The `_eventCache` in-memory map is also only refreshed on `listEvents()` calls — a page reload will show the new event.

## Important Rules

- All terminal commands must be **zsh compatible** (macOS)
- **Never read or process `.env` files**
- Respect all `.claudeignore` entries without exception
- **Always add comments to new code** explaining what it does and why — especially for non-obvious logic, Next.js conventions (`loading.js`, route groups, Suspense), and architectural decisions. Comments should explain the *why*, not just the *what*.

## Reference Docs
<!-- * this is for feature 1: Event Ticketing -->
- Database design: @docs/ticketing_schema_design_guide.md
- SQL schema: @docs/ANICONNECT_TICKETING_SCHEMA_V2.sql
- Event detail page perf: @docs/DETAIL_PAGE_PERF_FIX.md
