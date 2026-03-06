import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Routes that don't require authentication
const publicRoutes = [
  "/",
  "/login",
  "/signup",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/callback",
  "/events",
];

// Auth pages that authenticated users should be redirected away from
const authRoutes = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
];

// Routes that are always accessible (even without auth)
// These skip middleware entirely
const alwaysAccessible = [
  "/_next",
  "/api",
  "/favicon.ico",
  "/callback", // Auth callback must skip middleware to exchange code first
];

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes
  if (alwaysAccessible.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Create a response object that we can modify
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create Supabase client for middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name, options) {
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    },
  );

  const isPublicRoute = publicRoutes.some((route) =>
    route === "/" ? pathname === "/" : pathname.startsWith(route),
  );
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Always use getUser() — it validates the JWT with Supabase's auth server.
  // getSession() reads from cookies without server-side validation, which is insecure
  // in a middleware context (cookies can be tampered with).
  const { data } = await supabase.auth.getUser();
  const user = data.user ?? null;

  const isAuthenticated = !!user;
  const isEmailVerified = user?.email_confirmed_at != null;

  // If user is authenticated and trying to access auth pages, redirect to home
  if (isAuthenticated && isEmailVerified && isAuthRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If user is authenticated but email not verified, allow verify-email page
  if (isAuthenticated && !isEmailVerified) {
    if (
      !pathname.startsWith("/verify-email") &&
      !pathname.startsWith("/callback")
    ) {
      const email = user?.email || "";
      return NextResponse.redirect(
        new URL(
          `/verify-email?email=${encodeURIComponent(email)}`,
          request.url,
        ),
      );
    }
    return response;
  }

  // If user is not authenticated and trying to access protected route
  if (!isAuthenticated && !isPublicRoute) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
