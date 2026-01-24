# Auth Callback Fix Summary

## Problem

Magic links (email verification and passwordless login) were redirecting users to the **login page** instead of the **homepage**, while email/password login worked correctly.

---

## Investigation Process

### Step 1: Initial Analysis

Checked the auth flow files:
- `frontend/src/context/AuthContext.js` - Auth state management
- `frontend/src/app/(auth)/callback/page.js` - Callback page (277 lines)
- `frontend/src/middleware.js` - Route protection

### Step 2: First Fix Attempt - Missing `emailRedirectTo`

**Issue Found:** `signInWithMagicLink()` had empty options:
```javascript
// Before
const { error } = await supabase.auth.signInWithOtp({
  email,
  options: {},  // No redirect URL!
});
```

**Fix Applied:**
```javascript
// After
const { error } = await supabase.auth.signInWithOtp({
  email,
  options: {
    emailRedirectTo: `${window.location.origin}/callback`,
  },
});
```

**Result:** Still redirecting to login.

### Step 3: Route Group URL Mismatch

**Issue Found:** The callback page was at `frontend/src/app/(auth)/callback/page.js`

In Next.js App Router, `(auth)` is a **route group** - it organizes files but does NOT affect the URL path.
- Actual URL: `/callback`
- Code was using: `/auth/callback` ❌

**Fix Applied:** Changed all `emailRedirectTo` from `/auth/callback` to `/callback`.

**Result:** Still redirecting to login.

### Step 4: Soft Navigation Cookie Sync Issue

**Issue Found:** The callback page used `router.replace('/')` which is a **soft navigation** (client-side). The middleware runs server-side and wasn't seeing the cookies.

**Fix Applied:** Changed to `window.location.href = '/'` for hard navigation.

**Result:** Backend logs showed profile fetches succeeding, but still redirecting to login.

### Step 5: Convert to Route Handler

Decided to simplify by converting the 277-line page component to a ~35-line Route Handler.

**Created:** `frontend/src/app/callback/route.js`
**Deleted:** `frontend/src/app/(auth)/callback/page.js`

**Initial Route Handler:**
```javascript
export async function GET(request) {
  const code = searchParams.get("code");

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(origin + next);
    }
  }
  return NextResponse.redirect(origin + "/login?error=...");
}
```

**Result:** `Cookies set on response: 0` - No cookies!

### Step 6: Cookie Not Attached to Response

**Issue Found:** Using `cookies()` from `next/headers` sets cookies on a "current response context", but `NextResponse.redirect()` creates a **new response** that doesn't include those cookies.

**Fix Applied:** Create redirect response first, set cookies on it:
```javascript
const response = NextResponse.redirect(redirectUrl);
const supabase = createServerClient(url, key, {
  cookies: {
    getAll() { return request.cookies.getAll(); },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);  // Set on response!
      });
    },
  },
});
```

**Result:** Still `Cookies set on response: 0`

### Step 7: Async Timing Issue (Root Cause!)

**Issue Found:** Added logging and discovered `setAll` was being called **AFTER** the response was returned:

```
Exchange result - session: present
=== CODE EXCHANGE SUCCESS ===
Cookies set on response: 0          ← Response returned
GET /callback... 307                ← Browser receives redirect
setAll called with 3 cookies        ← Too late!
```

Supabase's `exchangeCodeForSession()` triggers `setAll` asynchronously via internal state management (probably `queueMicrotask` or similar).

### Step 8: Final Fix - Wait for setAll

**Solution:** Use a Promise to wait for `setAll` to be called before returning:

```javascript
export async function GET(request) {
  const code = searchParams.get("code");

  if (code) {
    const response = NextResponse.redirect(redirectUrl);

    // Promise that resolves when setAll is called
    let resolveSetAll;
    const cookiesSetPromise = new Promise((resolve) => {
      resolveSetAll = resolve;
    });

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
          resolveSetAll();  // Signal cookies are set
        },
      },
    });

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      await cookiesSetPromise;  // Wait for setAll!
      return response;
    }
  }
  return NextResponse.redirect("/login?error=...");
}
```

**Result:** ✅ `Cookies on response: 3` - Working!

---

## Final Files Changed

| File | Change |
|------|--------|
| `frontend/src/context/AuthContext.js` | Fixed `emailRedirectTo` URLs (line 123, 172) |
| `frontend/src/app/callback/route.js` | **Created** - Server-side Route Handler |
| `frontend/src/app/(auth)/callback/page.js` | **Deleted** - Old 277-line page component |

---

## Key Learnings

### 1. Next.js Route Groups
Folders with parentheses like `(auth)` are **route groups** - they organize code but don't affect URLs:
- `app/(auth)/login/page.js` → `/login` (NOT `/auth/login`)
- `app/(auth)/callback/page.js` → `/callback` (NOT `/auth/callback`)

### 2. Next.js Route Handlers vs Page Components
- **Page Components**: Client-side, need loading UI, cookies set in browser
- **Route Handlers**: Server-side, instant redirect, cookies in HTTP response

### 3. Supabase SSR Cookie Timing
`@supabase/ssr`'s `setAll` callback is called **asynchronously** after `exchangeCodeForSession()` returns. You must wait for it:
```javascript
await cookiesSetPromise;  // Don't return until cookies are set!
```

### 4. NextResponse.redirect() Creates New Response
```javascript
// ❌ Wrong - cookies set on different response
const cookieStore = await cookies();
cookieStore.set(name, value);
return NextResponse.redirect(url);  // New response without cookies!

// ✅ Correct - cookies set on same response
const response = NextResponse.redirect(url);
response.cookies.set(name, value);
return response;  // Same response with cookies!
```

### 5. Soft vs Hard Navigation
- `router.replace('/')` - Soft (client-side), may not trigger middleware properly
- `window.location.href = '/'` - Hard (full page load), guaranteed fresh request with cookies

---

## Architecture After Fix

```
Magic Link Flow:
1. User clicks magic link in email
2. Browser goes to: /callback?code=xxx
3. Route Handler (route.js):
   - Exchanges code for session tokens
   - Waits for setAll to be called
   - Sets cookies on redirect response
   - Returns 307 redirect to /
4. Browser follows redirect to / with cookies
5. Middleware reads cookies → finds session → allows access
6. Homepage renders ✅
```

---

## Debugging Tips for Future

1. **Add logging to `setAll`** to see when cookies are actually being set
2. **Log `response.cookies.getAll().length`** before returning to verify cookies attached
3. **Check middleware logs** to see if session is found
4. **Compare timing** of logs to identify async issues
