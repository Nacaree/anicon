/**
 * Auth Callback Route Handler
 *
 * Handles OAuth/magic link callbacks from Supabase by exchanging the
 * authorization code for a session and setting cookies on the response.
 *
 * Flow:
 * 1. User clicks magic link or verification email
 * 2. Supabase redirects to /callback?code=xxx
 * 3. This handler exchanges the code for session tokens
 * 4. Cookies are set in the redirect response headers
 * 5. User is redirected to homepage (or specified 'next' URL)
 *
 * Note: Supabase's setAll callback is called asynchronously after exchangeCodeForSession
 * returns. We use a Promise to wait for it before returning the response.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    // Create redirect response first - cookies will be set on this object
    const redirectUrl = new URL(next, origin);
    const response = NextResponse.redirect(redirectUrl);

    // Promise that resolves when Supabase calls setAll (async timing workaround)
    let resolveSetAll;
    const cookiesSetPromise = new Promise((resolve) => {
      resolveSetAll = resolve;
    });

    // Timeout fallback in case setAll is never called
    const timeoutId = setTimeout(resolveSetAll, 5000);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // Set each cookie on the redirect response
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
            clearTimeout(timeoutId);
            resolveSetAll();
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      // Wait for cookies to be set before returning response
      await cookiesSetPromise;
      return response;
    }

    clearTimeout(timeoutId);
  }

  // No code or exchange failed - redirect to login with error
  return NextResponse.redirect(
    new URL("/login?error=auth_callback_error", origin)
  );
}
