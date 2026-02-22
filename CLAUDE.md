# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Summary

AniCon is a platform for Cambodia's anime community — event ticketing, creator content, and community features. It is a full-stack monorepo: a **Next.js 16** frontend and a **Spring Boot 3.4 / Java 21** backend, backed by **Supabase (PostgreSQL)**.

Key reference docs:
- `docs/PLANNING2.md` — Auth flows, role system, entity designs, query patterns
- `schema.sql` — Full profiles/follows schema (run in Supabase SQL editor)
- `docs/ANICONNECT_TICKETING_SCHEMA_V2.sql` — Ticketing schema (Feature 1)
- `docs/ticketing_schema_design_guide.md` — Ticketing design rationale and payment flow
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
./mvnw spring-boot:run          # Run the app (localhost:8080)
./mvnw test                     # Run all tests
./mvnw test -Dtest=ClassName    # Run a single test class
./mvnw jooq-codegen:generate    # Regenerate JOOQ types after schema changes
```

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

- **Routing:** Next.js App Router. `(auth)/` is a route group for login/signup flows; `events/[id]/` is a dynamic route.
- **Middleware:** `src/proxy.js` handles route protection — it uses `@supabase/ssr` to read the session from cookies, redirects unauthenticated users to `/login`, and gates unverified emails to `/verify-email`. It exports a `proxy` named export (not `middleware`).
- **State:** Three React contexts — `AuthContext` (session + user), `AuthGateContext` (modal prompting unauthenticated users), `SidebarContext` (visibility toggle).
- **API calls:** All authenticated requests go through `src/lib/api.js`, which injects the JWT automatically and wraps errors in an `ApiError` class. Defaults to `http://localhost:8080`; override with `NEXT_PUBLIC_API_URL`.
- **UI components:** Shadcn/ui (New York style) with Radix UI primitives, Lucide icons, and Tailwind CSS 4. Custom components live in `src/components/`; shadcn-managed primitives live in `src/components/ui/`.
- **Styling:** Tailwind CSS 4 (PostCSS-based, not config-file-based). Theme tokens are CSS custom properties in `globals.css` using OKLch color space. Dark mode uses the `.dark` class. Primary brand color is `#FF7927` (orange).
- **Performance:** React Compiler is enabled (`reactCompiler: true` in `next.config.mjs`). Heavy components use `next/dynamic` with skeleton loaders.
- **Mock data:** `src/data/mockEvents.js` provides all event data while the backend events API is not yet built.
- **Testing:** No test framework is configured in the frontend.

### Backend Architecture

- **ORM strategy:** JPA/Hibernate for simple CRUD; JOOQ for complex queries. JOOQ types are generated into `backend/src/main/java/...` via `./mvnw jooq-codegen:generate`.
- **Security:** Stateless JWT auth (no sessions). `JwtAuthenticationFilter` → `SupabaseJwtValidator` → `SupabaseUserPrincipal`. Rate limiting via Bucket4j (`RateLimitFilter`). Caching via Caffeine.
- **Layers:** `controller/` → `service/` → `repository/` (JPA) or JOOQ DSL context.

## Database

### Key Tables

| Table | Purpose |
|---|---|
| `auth.users` | Supabase-managed auth |
| `profiles` | User data; created by DB trigger on signup |
| `follows` | Follower graph |
| `influencer_applications` | Role upgrade requests |

### Role System

Valid roles: `fan`, `influencer`, `creator`, `organizer`

Valid combinations only:
- `[fan]` — default
- `[influencer]` — approved fan
- `[creator]` — admin-assigned
- `[organizer]` — admin-assigned
- `[creator, organizer]` — the only multi-role combo

### Constraints & Conventions

- Username: max 20 chars, alphanumeric + underscore only
- `follower_count` / `following_count` are denormalized on `profiles` and updated atomically on follow/unfollow — do not recount from the `follows` table
- All timestamps use `timestamptz`

## Important Rules

- All terminal commands must be **zsh compatible** (macOS)
- **Never read or process `.env` files**
- Respect all `.claudeignore` entries without exception


## Reference Docs
<!-- * this is for feature 1: Event Ticketing -->
- Database design: @docs/ticketing_schema_design_guide.md
- SQL schema: @docs/ANICONNECT_TICKETING_SCHEMA_V2.sql