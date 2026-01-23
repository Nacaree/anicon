# AniCon Development Session - January 23, 2024

## Overview
This session continued Phase 1 (Login/Register) implementation, completing backend security configuration and the entire frontend authentication system.

---

## Backend Changes

### 1. SecurityConfig.java
**File:** `backend/src/main/java/com/anicon/backend/config/SecurityConfig.java`

**Changes:**
- Added CORS configuration using `cors.allowed.origins` property
- Added RateLimitFilter to the security filter chain
- Configured public endpoints:
  - `/api/health` - health check
  - `/api/public/**` - public resources
  - `/api/auth/resend-verification` - resend verification email
  - `/api/auth/magic-link` - send magic link
  - `GET /api/profiles/user/**` - view profile by ID
  - `GET /api/profiles/{username}` - view profile by username
- All other endpoints require authentication

### 2. Rate Limiting
**Files Created:**
- `backend/src/main/java/com/anicon/backend/config/RateLimitConfig.java`
- `backend/src/main/java/com/anicon/backend/security/RateLimitFilter.java`

**Configuration (in application.properties):**
```properties
rate-limit.default-requests-per-minute=60
rate-limit.auth-requests-per-minute=10
rate-limit.public-requests-per-minute=30
```

**Dependency Added (pom.xml):**
```xml
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j-core</artifactId>
    <version>8.10.1</version>
</dependency>
```

### 3. ProfileController Fix
**File:** `backend/src/main/java/com/anicon/backend/controller/ProfileController.java`

**Change:** Fixed authentication principal casting - was incorrectly casting to `UUID`, now properly uses `@AuthenticationPrincipal SupabaseUserPrincipal principal`

---

## Frontend Implementation

### Dependencies Installed
```bash
npm install @supabase/supabase-js
npm install @supabase/ssr
```

### Files Created

#### Configuration
| File | Purpose |
|------|---------|
| `frontend/.env.local` | Environment variables (Supabase URL, anon key, API URL) |
| `frontend/src/lib/supabase.js` | Supabase client initialization |
| `frontend/src/lib/api.js` | Backend API wrapper with auth headers |

#### Auth Context
| File | Purpose |
|------|---------|
| `frontend/src/context/AuthContext.js` | React context for auth state management |
| `frontend/src/app/providers.js` | Client-side provider wrapper |

#### Auth Pages (Route Group: `(auth)`)
| File | Purpose |
|------|---------|
| `frontend/src/app/(auth)/layout.js` | Split layout (form left, orange accent right) |
| `frontend/src/app/(auth)/login/page.js` | Login with password or magic link |
| `frontend/src/app/(auth)/signup/page.js` | Registration with validation |
| `frontend/src/app/(auth)/verify-email/page.js` | Email verification prompt |
| `frontend/src/app/(auth)/callback/page.js` | Supabase auth callback handler |
| `frontend/src/app/(auth)/forgot-password/page.js` | Password reset request |
| `frontend/src/app/(auth)/reset-password/page.js` | New password form |

#### Middleware
| File | Purpose |
|------|---------|
| `frontend/src/middleware.js` | Route protection, redirect logic |

### Modified Files
| File | Change |
|------|--------|
| `frontend/src/app/layout.js` | Added `<Providers>` wrapper |

---

## Auth Flow Summary

### Signup Flow
1. User fills form (email, password, username, display name)
2. Frontend validates (username format, password match)
3. Calls Supabase `signUp()` → creates auth user
4. Calls backend `POST /api/profiles` → creates profile
5. If profile fails → calls `DELETE /api/auth/cleanup`
6. Redirects to `/verify-email`

### Login Flow (Password)
1. User enters email + password
2. Calls Supabase `signInWithPassword()`
3. Checks if email verified
4. If not verified → redirect to `/verify-email`
5. If verified → fetch profile → redirect to home

### Login Flow (Magic Link)
1. User enters email
2. Calls Supabase `signInWithOtp()`
3. Shows "check your email" message
4. User clicks link → `/callback` → home

### Password Reset Flow
1. User requests reset at `/forgot-password`
2. Calls Supabase `resetPasswordForEmail()`
3. User clicks email link → `/reset-password`
4. User enters new password
5. Calls Supabase `updateUser()`
6. Redirects to login

---

## Middleware Route Protection

| Scenario | Action |
|----------|--------|
| Authenticated + verified → auth pages | Redirect to `/` |
| Authenticated + unverified → any page | Redirect to `/verify-email` |
| Unauthenticated → protected page | Redirect to `/login` |
| Unauthenticated → public page | Allow |

**Public Routes:**
- `/login`
- `/signup`
- `/verify-email`
- `/forgot-password`
- `/reset-password`
- `/callback`

---

## Environment Variables

### Frontend (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=https://rsongscpipemetlknnkc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### Backend (application.properties)
```properties
supabase.service.role.key=${SUPABASE_SERVICE_ROLE_KEY:}
```
**Note:** Set `SUPABASE_SERVICE_ROLE_KEY` environment variable for admin operations (user deletion, resend verification).

---

## Testing

### Start Backend
```zsh
cd backend && ./mvnw spring-boot:run
```

### Start Frontend
```zsh
cd frontend && npm run dev
```

### Test URLs
- Signup: http://localhost:3000/signup
- Login: http://localhost:3000/login
- Forgot Password: http://localhost:3000/forgot-password

---

## Next Steps (Not Implemented)
- Profile update page
- Homepage with auth-aware content
- User settings
- Follow system UI
