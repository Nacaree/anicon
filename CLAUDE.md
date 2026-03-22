# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Summary

AniCon is a social platform for Cambodia's anime community — event ticketing, creator portfolios, social posts, real-time notifications, and community features. It is a full-stack monorepo: a **Next.js 16** frontend and a **Spring Boot 3.4 / Java 21** backend, backed by **Supabase (PostgreSQL)**.

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
- **State:** Four React contexts — `AuthContext` (session + user), `AuthGateContext` (modal prompting unauthenticated users), `SidebarContext` (visibility toggle), `PostModalContext` (global post detail modal). Use the `useAuth()` hook to access `AuthContext`; it exposes: `user`, `profile`, `isLoading`, `isAuthenticated`, `emailVerified`, `signUp`, `signIn`, `signInWithMagicLink`, `signOut`, `resetPassword`, `updatePassword`, `refreshSession`, `fetchProfile`. Note: Supabase does not return an error for duplicate emails on signup — detect it by checking `authData.user?.identities?.length === 0`.
- **PostModalContext:** A global singleton that renders one `PostDetailModal` at the app root. `usePostModal()` exposes `openPost(id)` (fetches from API), `openPostDirect(data)` (already-loaded post), `closePost()`, and `registerCallbacks()`. Pages with feeds register `onPostDeleted`/`onEdit` callbacks so modal actions update the underlying feed. Also listens for `anicon-open-post` custom events (dispatched by notifications and search results).
- **API calls:** All authenticated requests go through `src/lib/api.js`, which injects the JWT automatically, wraps errors in an `ApiError` class, and retries on 5xx errors (3 attempts, 500ms backoff). Defaults to `http://localhost:8080`; override with `NEXT_PUBLIC_API_URL`. `normalizeEvent()` in `api.js` maps backend field names to frontend expectations: `eventDate`→`date`, `eventTime`→`time`, `coverImageUrl`→`imageUrl`/`images`/`thumbnails`, `currentAttendance`→`wantToGoCount`, and also adds `timeRange`/`dateRange` aliases. Three auth modes on `request()`: `noAuth: true` skips token entirely (public endpoints), `bestEffortAuth: true` attaches the cached token synchronously if available but never calls `getSession()` (optionally-authenticated endpoints like `event-status`), default calls `getAuthHeaders()` which awaits the token (fully auth-required endpoints).
- **Event cache:** `api.js` maintains a module-level `_eventCache` (Map). `eventApi.listEvents()` populates it; `eventApi.getEvent(id)` hits the cache first and only fetches Railway if the cache is empty (e.g. on a direct link to `/events/:id`). `getCachedEvent(id)` and `getCachedEvents()` are exported for synchronous reads — the event detail page uses these to render with real data on first paint, avoiding a skeleton flash when the user navigated from the events list.
- **Token caching:** `api.js` maintains a `_cachedAccessToken` updated by `AuthContext`. This avoids concurrent `getSession()` calls that would deadlock via Supabase's `navigator.locks`. Do not call `supabase.auth.getSession()` directly inside page components — use the cached token path through `api.js` or read from `AuthContext`.
- **UI components:** Shadcn/ui (New York style) with Radix UI primitives, Lucide icons, and Tailwind CSS 4. Custom components live in `src/components/`; shadcn-managed primitives live in `src/components/ui/`.
- **Styling:** Tailwind CSS 4 (PostCSS-based, not config-file-based). Theme tokens are CSS custom properties in `globals.css` using OKLch color space. Dark mode uses the `.dark` class. Primary brand color is `#FF7927` (orange).
- **Interactive chip pattern:** All clickable chip/pill buttons must include scale animations — `hover:scale-[1.02] active:scale-[0.98] transition-all`. Never add a chip without these. For modal action buttons, also add glow shadows: primary (orange) uses `hover:shadow-[0_4px_20px_rgba(255,121,39,0.4)]`, destructive (red) uses `hover:shadow-[0_4px_20px_rgba(239,68,68,0.4)]`.
- **Performance:** React Compiler is enabled (`reactCompiler: true` in `next.config.mjs`). Heavy components use `next/dynamic` with skeleton loaders. Event cards use `<Link prefetch={true}>` so the RSC payload for each detail page is pre-fetched while cards are visible — navigation is instant with no skeleton. Do not add a `loading.js` to `app/events/[id]/` — it was deliberately removed because `prefetch={true}` eliminates the RSC wait that made it necessary.
- **Mock data:** `src/data/mockEvents.js` exists but is **deprecated and unused** — `app/events/page.js` already calls `eventApi.listEvents()` with the real backend API.
- **Testing:** No test framework is configured in the frontend.

### Backend Architecture

- **ORM strategy:** JPA/Hibernate for simple CRUD (profiles, follows, influencer_applications); JOOQ for complex queries (all ticketing tables). JOOQ types live in `com.anicon.backend.gen.jooq` and are **committed to git** (not gitignored) so Railway CI builds don't need a live DB connection. To regenerate after schema changes: run `./mvnw jooq-codegen:generate` locally with a real DB, then commit the output. The build flag `-Djooq.codegen.skip=true` is set in `Dockerfile` to skip codegen in CI.
- **Security:** Stateless JWT auth (no sessions). `JwtAuthenticationFilter` → `SupabaseJwtValidator` → `SupabaseUserPrincipal`. Rate limiting via Bucket4j (`RateLimitFilter`). Caching via Caffeine. CORS origins are read from the `CORS_ALLOWED_ORIGINS` env var (comma-separated) in `SecurityConfig` — set this to `http://localhost:3000` locally and `https://anicon.online` in production.
- **Layers:** `controller/` → `service/` → `repository/` (JPA) or JOOQ DSLContext.
- **Ticketing sub-package:** All ticketing code lives in `com.anicon.backend.ticketing` — `EventController`, `EventService`, `TicketController`, `TicketService`, `PayWayService`, `StripeService`, `StripeWebhookController`, and `dto/`. This package uses JOOQ exclusively (no JPA entities).
- **Creator sub-package:** `com.anicon.backend.creator` — `CreatorController`, `CreatorService`, `PortfolioController`, `PortfolioService`, `UserEventsController`, `UserEventsService`, `RoleChecker`, and `dto/`. Portfolio uses JPA; user events uses JOOQ. `RoleChecker` is a static utility that gates field updates and portfolio access by role.
- **Social sub-package:** `com.anicon.backend.social` — `PostController`, `PostService`, `CommentController`, `CommentService`, and JPA entities (`Post`, `PostImage`, `PostComment`, `PostLike`, `CommentLike`). Handles post CRUD, likes/unlikes, reposts, nested comments. Uses denormalized counters (`like_count`, `comment_count`, `repost_count`). Reposts tracked via `original_post_id`. Posts support soft-delete (`is_deleted`). Post images stored in Supabase Storage (`posts/` bucket).
- **Notification sub-package:** `com.anicon.backend.notification` — `NotificationController`, `NotificationService`, `NotificationEventHandler`, JPA entity `Notification`. Uses Spring's `@TransactionalEventListener(AFTER_COMMIT)` + `@Async` pattern — services publish `NotificationEvent` records, the handler persists and pushes via STOMP WebSocket. 7 types: `like_post`, `comment_post`, `reply_comment`, `like_comment`, `repost_post`, `like_portfolio`, `follow_user`. Upsert dedup on `(actor_id, type, target_id)`. Never notifies self; deletes notification on unlike/unfollow.
- **Search sub-package:** `com.anicon.backend.search` — `SearchController`, `SearchService`. Unified `GET /api/search?q=&type=&limit=` endpoint. ILIKE search across users (username + display_name), events (title + description + location + tags), and posts (text_content). Uses JOOQ with batch-fetching to avoid N+1.
- **WebSocket:** STOMP broker on `/ws` with SockJS fallback. `WebSocketConfig` enables the broker, `WebSocketAuthInterceptor` validates JWT on STOMP CONNECT. Clients subscribe to `/user/queue/notifications` for real-time push.

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
| `GET` | `/api/tickets/event-status/{eventId}` | Optional | Returns `{ ticketCount, hasRsvp }` for current user; 0/false for guests |
| `POST` | `/api/tickets/{transactionId}/cancel` | Required | Cancel abandoned Stripe PaymentIntent and mark transaction cancelled |
| `POST` | `/api/stripe/webhook` | Public (HMAC) | Stripe webhook — issues ticket on `payment_intent.succeeded` |
| `PATCH` | `/api/creator/profile` | Required | Update creator profile fields (role-gated) |
| `GET` | `/api/portfolio/{userId}` | Public | Get user's portfolio items |
| `POST` | `/api/portfolio` | Required | Add portfolio item (creator only) |
| `PUT` | `/api/portfolio/{id}` | Required | Update portfolio item (owner only) |
| `DELETE` | `/api/portfolio/{id}` | Required | Delete portfolio item (owner only) |
| `GET` | `/api/users/{userId}/events/going` | Public | Events user RSVP'd or bought tickets for |
| `GET` | `/api/users/{userId}/events/hosted` | Public | Events user organized (`?miniOnly=true` for influencers) |
| `POST` | `/api/posts` | Required | Create post with text/images |
| `GET` | `/api/posts/feed?cursor=&limit=20` | Optional | Paginated feed (cursor-based, newest first) |
| `GET` | `/api/posts/user/{userId}?cursor=` | Optional | User's posts (for profile HomeTab) |
| `GET` | `/api/posts/{id}` | Optional | Single post (for detail page/modal) |
| `PATCH` | `/api/posts/{id}` | Required | Edit post (owner only) |
| `DELETE` | `/api/posts/{id}` | Required | Soft-delete post (owner only) |
| `POST` | `/api/posts/{id}/like` | Required | Like a post |
| `DELETE` | `/api/posts/{id}/like` | Required | Unlike a post |
| `POST` | `/api/posts/{id}/repost` | Required | Repost |
| `DELETE` | `/api/posts/{id}/repost` | Required | Undo repost |
| `GET` | `/api/posts/{id}/comments` | Optional | Fetch comments (nested via `parentId`) |
| `POST` | `/api/posts/{id}/comments` | Required | Add comment |
| `DELETE` | `/api/comments/{id}` | Required | Delete comment (owner only) |
| `POST` | `/api/comments/{id}/like` | Required | Like a comment |
| `DELETE` | `/api/comments/{id}/like` | Required | Unlike a comment |
| `GET` | `/api/notifications` | Required | Fetch notifications (`?limit=&offset=`) |
| `GET` | `/api/notifications/unread-count` | Required | Unread count for bell badge |
| `PATCH` | `/api/notifications/{id}/read` | Required | Mark one as read |
| `PATCH` | `/api/notifications/read-all` | Required | Mark all as read |
| `GET` | `/api/search?q=&type=&limit=` | Optional | Unified search (users, events, posts) |

### Key Design Patterns

- **Money storage:** `transactions.amount` is `bigint` in **cents** (e.g. 500 = $5.00). `events.ticket_price` is `numeric(10,2)` in **dollars**. Never mix them — divide cents by 100 for display.
- **Atomic capacity enforcement:** Uses `UPDATE events SET current_attendance = current_attendance + 1 WHERE id = ? AND (max_capacity IS NULL OR current_attendance < max_capacity)`. If 0 rows affected → throw 409 CONFLICT (sold out). Prevents overselling without locking.
- **Deferred attendance increment (paid events):** `current_attendance` is only incremented after payment is confirmed — not on initiation. PayWay: confirmed in `verifyAndIssueTicket()`. Stripe: confirmed in `handleStripePaymentSucceeded()` (called by webhook).
- **Payment provider routing:** `TicketService.initiatePurchase()` routes to `StripeService` when `paymentMethod == "card"`, and to `PayWayService` for all other values (`aba_pay`, `khqr`, `wechat`, `alipay`). Both providers write to the same `transactions` table with a `payment_provider` column ("stripe" or "payway"). The `PurchaseResponse` includes `paymentProvider` + either `stripeClientSecret` (Stripe) or `checkoutUrl` + `paywayTranId` + `qrImage` + `qrString` + `abapayDeeplink` (PayWay) — check `paymentProvider` on the frontend before deciding which field to use.
- **Paid event purchase UI flow (3 steps):** (1) `TicketQuantityModal` — user picks quantity; (2) `PaymentMethodModal` — user picks payment method and the purchase API is called; (3) method-specific checkout — PayWay redirects to external URL or `payment/checkout/`, Stripe opens `StripePaymentModal` in-page. All three components live in `src/components/payments/` and are orchestrated by `EventTicketCard`.
- **Dual payment UI flow:** PayWay (`aba_pay`, `khqr`, `wechat`, `alipay`) redirects the user to an external checkout URL; the frontend's `payment/checkout/` and `payment/verify/` pages handle the return flow, with state (QR image, tran ID, amount) passed via `sessionStorage`. Stripe (`card`) stays on-site: `StripePaymentModal` uses Stripe Elements, the backend returns a `stripeClientSecret`, and the ticket is issued asynchronously via webhook — no verify page needed.
- **Payment state between pages:** PayWay checkout/verify pages pass state via `sessionStorage`, not URL params. Both `payment/verify/` and `payment/success/` use `useSearchParams()` wrapped in `<Suspense>` — required by Next.js App Router; omitting it causes a build error.
- **JOOQ multiset for tags:** Tags are loaded in one SQL round-trip (no N+1) using JOOQ's `multiset()` function.
- **Tag upsert:** Two-step — INSERT tag ON CONFLICT DO NOTHING, then SELECT tag ID by name.
- **Duplicate RSVP prevention:** The DB `UNIQUE (user_id, event_id)` constraint on `event_rsvps` rejects duplicates; `GlobalExceptionHandler` maps the resulting `DataIntegrityViolationException` to 409 CONFLICT.
- **Post feed pagination:** Cursor-based (not offset-based). The cursor is the last post's `created_at` timestamp. `GET /api/posts/feed?cursor=&limit=20` returns newest first. Frontend uses infinite scroll with `IntersectionObserver`.
- **Denormalized counters on posts:** `like_count`, `comment_count`, `repost_count` are incremented/decremented atomically on actions — no `COUNT()` queries needed for display.
- **Notification event pattern:** Services publish `NotificationEvent` Spring events (e.g. `PostService.likePost()` → `like_post` event). `NotificationEventHandler` listens after commit (`@TransactionalEventListener(AFTER_COMMIT)`) and persists + pushes via STOMP. This decouples notification logic from business logic.
- **Notification dedup:** Upsert on `UNIQUE(actor_id, type, target_id)` prevents duplicates from like→unlike→like cycles. Unlike/unfollow deletes the notification.
- **Real-time notifications:** STOMP WebSocket (`/ws`) with SockJS fallback. Frontend `useNotificationCount()` hook auto-reconnects (5s backoff) and falls back to HTTP polling (30s) if WebSocket fails. Module-level cache survives page navigation with 5-minute TTL.
- **Post images:** Uploaded to Supabase Storage (`posts/` bucket, path: `{userId}/{timestamp}-{random}.{ext}`). Displayed in CSS scroll-snap carousel with IntersectionObserver dot indicators. Natural sizing (no upscale).

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
| `portfolio_items` | Creator gallery items (images, metadata, ordering) |
| `posts` | Social posts (text_content, original_post_id for reposts, denormalized counters, soft-delete via is_deleted) |
| `post_images` | Post image URLs with display_order |
| `post_likes` | Post like records (UNIQUE on post_id + user_id) |
| `post_comments` | Nested comments (parent_id for replies, like_count, soft-delete) |
| `comment_likes` | Comment like records |
| `notifications` | Push notifications (recipient_id, actor_id, type, target_id, reference_id, is_read; UNIQUE on actor_id + type + target_id) |

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

Profile feature visibility (enforced by `RoleChecker` backend + `lib/roles.js` frontend):
- Portfolio gallery: creator only
- Creator type setting: creator only
- Support/tip links: everyone except pure organizer (creator+organizer combo keeps them)
- Events "Going" tab: everyone except organizer
- Events "Hosted" tab: organizer only (includes creator+organizer combo)

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
- My Tickets page (`app/tickets/page.js`): merges paid tickets + free RSVPs sorted by event date, with per-user ticket status badge on the event detail card (`EventTicketCard` → `ticketApi.eventStatus()`)

**Working (Creator/Profile features):**
- Creator portfolio: `PortfolioController` CRUD endpoints, `PortfolioGrid`/`PortfolioCard`/`PortfolioUploadModal` frontend components, portfolio likes (heart button + double-click-to-like in lightbox)
- Creator settings: `PATCH /api/creator/profile` updates display name, bio, banner, creator type, support links — role-gated by `RoleChecker` in `CreatorService`
- Role-based profile sections: portfolio (creator only), support links (not organizer), events hosted tab (organizer only), events going tab (not organizer)
- Profile tabs: `ProfileTabs` → `HomeTab` (user's posts feed) + `EventsTab` with role-based sub-tabs (`EventsGoingSection`, `EventsHostedSection`)
- Role badges: `RoleBadge` component shows all non-fan roles; multi-role users (creator+organizer) see multiple badges
- Frontend role utilities: `lib/roles.js` mirrors backend `RoleChecker.java`

**Working (Social Posts):**
- Full post CRUD: create with text + multiple images, edit, soft-delete
- Post feed with cursor-based pagination and infinite scroll
- Likes, reposts, nested comments with replies
- `PostComposer`/`PostComposerModal` for creating/editing posts with drag-to-reorder image grid
- `PostCard` feed card with image carousel (CSS scroll-snap), expand/collapse text, action bar
- `PostDetailModal` (Instagram-style) via global `PostModalContext` — opened from feed, notifications, or search
- Dedicated `/posts/[id]` page for direct linking/sharing
- Optimistic UI updates for likes/reposts
- Hashtag support: `HashtagText` component renders `#tags` as clickable orange links → `/search?q=#tag&tab=posts`

**Working (Notifications):**
- 7 notification types: `like_post`, `comment_post`, `reply_comment`, `like_comment`, `repost_post`, `like_portfolio`, `follow_user`
- Real-time push via STOMP WebSocket (`/ws`) with SockJS fallback
- `NotificationDropdown` with bell badge, mark-as-read, mark-all-read
- `useNotificationCount()` hook: STOMP auto-reconnect + HTTP polling fallback (30s)
- Post notifications open `PostDetailModal` via custom `anicon-open-post` event

**Working (Search):**
- Unified search across users, events, and posts via `GET /api/search`
- `SearchDropdown` in header with debounced instant results (top 3 per category)
- Full `/search?q=` results page with type filter
- `"/"` hotkey focuses search bar (desktop) or opens mobile search overlay (skips when user is in input/textarea)

**Working (Home Page Layout):**
- Left: Featured events carousel + event sections + social feed (PostComposer + PostFeed with infinite scroll)
- Right: `RightPanel` with creator profile card, "Trending Now" section, and recommended users

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
- **Mobile-first frontend:** All frontend work — whether building new components or making manual tweaks/adjustments — must be responsive and tested for mobile viewports. Judges will test AniCon on mobile devices. Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) — design for small screens first, then layer on desktop styles. Every change must look and function correctly on phones (~375px width) before considering desktop. This applies equally to initial builds and follow-up modifications.

## Reference Docs
<!-- * this is for feature 1: Event Ticketing -->
- Database design: @docs/ticketing_schema_design_guide.md
- SQL schema: @docs/ANICONNECT_TICKETING_SCHEMA_V2.sql
- Event detail page perf: @docs/DETAIL_PAGE_PERF_FIX.md
<!-- * this is for feature 3: Creator Portfolio -->
- Creator portfolio spec: @docs/FEATURE3_COMPLETE.md
- Profile progress: @docs/PROFILE_PROGRESS.md
<!-- * Social posts & notifications -->
- Social posts progress: @docs/SOCIAL_POSTS_PROGRESS.md
- Notification system: @docs/NOTIFICATION_PROGRESS.md
- Global search plan: @docs/GLOBAL_SEARCH_PLAN.md
- Event scraping spec: @docs/EVENT_SCRAPING_PLAN_FINAL.md
