# AniCon Deployment Guide

> **Stack:** Spring Boot backend on Railway · Next.js frontend on Vercel · Supabase (PostgreSQL)
> **Domain:** `anicon.online` (Vercel) · Backend: `anicon-production.up.railway.app` (Railway)

---

## Architecture

```
Browser → anicon.online (Vercel / Next.js)
               ↓ NEXT_PUBLIC_API_URL
       anicon-production.up.railway.app (Railway / Spring Boot)
               ↓
         Supabase (PostgreSQL)
```

---

## Backend — Railway

### Setup

1. Create a new Railway project → **Deploy from GitHub repo** → select `anicon` repo
2. Set the **Root Directory** to `backend`
3. Railway will auto-detect the `Dockerfile` at `backend/Dockerfile`

### Environment Variables (set in Railway dashboard)

| Variable | Example Value |
|---|---|
| `SUPABASE_DB_URL` | `jdbc:postgresql://...` |
| `SUPABASE_DB_USERNAME` | `postgres` |
| `SUPABASE_DB_PASSWORD` | `...` |
| `SUPABASE_JWT_SECRET` | `...` |
| `CORS_ALLOWED_ORIGINS` | `https://anicon.online` |
| `PAYWAY_MERCHANT_ID` | `...` |
| `PAYWAY_API_KEY` | `...` |
| `PAYWAY_RETURN_URL` | `https://anicon.online/payment/verify` |
| `STRIPE_SECRET_KEY` | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |

### How the Docker build works

The `Dockerfile` uses a multi-stage build:
- **Build stage:** `maven:3.9-eclipse-temurin-21` — compiles the app, skips JOOQ codegen
- **Runtime stage:** `eclipse-temurin:21-jre` — runs `app.jar`

JOOQ generated sources are **committed to git** (`src/main/java/com/anicon/backend/gen/jooq`) so Railway doesn't need a DB connection at build time. The build flag `-Djooq.codegen.skip=true` is passed in the Dockerfile.

### Key config files

- `backend/Dockerfile` — explicit Java 21 build (bypasses Railway's Nixpacks auto-detection)
- `backend/railway.toml` — healthcheck path, restart policy
- `backend/nixpacks.toml` — kept for reference but unused (Dockerfile takes precedence)

### Health check

Railway polls `GET /api/health` every 30s. The app must respond within 300s on first boot (cold start on free tier is slow).

### Regenerating JOOQ types (after schema changes)

Run locally with a live DB connection, then commit the output:

```zsh
./mvnw jooq-codegen:generate
git add src/main/java/com/anicon/backend/gen/
git commit -m "regen: update JOOQ generated sources"
```

---

## Frontend — Vercel

### Setup

1. Import GitHub repo on Vercel
2. Set **Root Directory** to `frontend`
3. Vercel auto-detects Next.js

### Environment Variables (set in Vercel dashboard)

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://anicon-production.up.railway.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` |

> **Important:** `NEXT_PUBLIC_API_URL` must be the full Railway URL with no trailing slash. Without it, the frontend defaults to `http://localhost:8080` and all API calls break in production.

### Custom Domain

- `anicon.online` → A record `76.76.21.21` (Vercel)
- `www.anicon.online` → CNAME `cname.vercel-dns.com` (Vercel)

Both set up in your domain registrar's DNS settings. Vercel auto-provisions TLS.

### Deployment branch

Vercel deploys from `main`. Develop on feature branches, merge to `main` to deploy:

```zsh
git checkout main
git merge feature-your-branch
git push origin main
```

---

## Stripe Webhook

1. Stripe Dashboard → Developers → Webhooks → **Add endpoint**
2. URL: `https://anicon-production.up.railway.app/api/stripe/webhook`
3. Event: `payment_intent.succeeded`
4. Copy the signing secret → set as `STRIPE_WEBHOOK_SECRET` on Railway

---

## Issues Encountered During Initial Deployment

### 1. `.env` file missing at build time
**Error:** `Properties could not be loaded from File: /app/.env`
**Fix:** Set `<quiet>true</quiet>` in `properties-maven-plugin` in `pom.xml` so missing `.env` is silently ignored.

### 2. Java version mismatch
**Error:** `class file version 65.0 ... only recognizes class file versions up to 63.0`
**Cause:** JOOQ 3.20 requires Java 21. Railway defaulted to Java 19 via Nixpacks.
**Fix:** Added explicit `Dockerfile` using `maven:3.9-eclipse-temurin-21`. Nixpacks is bypassed when a Dockerfile is present.

### 3. JOOQ codegen needs DB at build time
**Error:** `Cannot execute query. No JDBC Connection configured`
**Cause:** Railway doesn't inject env vars into Docker build stages by default.
**Fix:** Run `./mvnw jooq-codegen:generate` locally, commit the generated files to `src/main/java`, pass `-Djooq.codegen.skip=true` in the Dockerfile.

### 4. Healthcheck failing after deploy
**Error:** All 11 healthcheck attempts failed on `/api/health`
**Cause:** `railway.toml` `startCommand` referenced `target/anicon-backend-1.0.0.jar` but Dockerfile copies JAR to `/app/app.jar`.
**Fix:** Updated `startCommand = "java -Xms256m -Xmx768m -jar /app/app.jar"` in `railway.toml`.

### 5. Vercel prerender error on `/payment/verify`
**Error:** `Export encountered an error on /payment/verify/page`
**Cause:** `useSearchParams()` in Next.js App Router requires a `<Suspense>` boundary for static prerendering.
**Fix:** Extracted component logic into `PaymentVerifyContent`, wrapped in `<Suspense>` in the page's default export. Same fix applied to `/payment/success`.

### 6. Frontend calling wrong API URL
**Symptom:** Network requests going to `https://anicon.online/anicon-production.up.railway.app/api/...`
**Cause:** `NEXT_PUBLIC_API_URL` was not set on Vercel — the Railway URL was accidentally concatenated as a path.
**Fix:** Set `NEXT_PUBLIC_API_URL=https://anicon-production.up.railway.app` in Vercel environment variables, then redeploy.

---

## PayWay Local Testing

Set `payway.mock-approved=true` in `application-dev.properties` to bypass real PayWay API calls during local development:

```zsh
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```
