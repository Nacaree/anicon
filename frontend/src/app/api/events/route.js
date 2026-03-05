// Proxy route handler for GET /api/events.
//
// Why this exists:
// The backend lives on Railway (a single region server ~300–400ms from SEA users).
// If the browser calls Railway directly, every page load costs that round-trip.
// This handler sits on Vercel's edge network. Vercel caches the response for 5
// minutes (revalidate=300), so the second and all subsequent requests are served
// from the nearest Vercel PoP in ~20ms — the browser never talks to Railway.
//
// Cache miss flow:  browser → Vercel edge → Railway (~400ms, happens once per 5min)
// Cache hit flow:   browser → Vercel edge cache (~20ms, all other requests)
export const revalidate = 300;

const RAILWAY_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function GET() {
  const res = await fetch(`${RAILWAY_URL}/api/events`, {
    // next.revalidate populates Next.js's data cache — used as the source for the
    // route-level cache above so both layers stay in sync.
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    return Response.json([], { status: res.status });
  }

  const data = await res.json();
  return Response.json(data);
}
