// Server Component — no "use client".
//
// This is intentionally a thin async wrapper. Its only job is to fetch the event
// from Railway on Vercel's server before sending any HTML to the browser.
//
// Why this matters:
//   Client-side fetch (old):  browser → Railway (~300–400ms, full internet hop)
//   Server-side fetch (new):  Vercel server → Railway (~50ms, same AWS region)
//   After ISR warms up:       Vercel edge cache → browser (~20ms, no Railway hit at all)
//
// The event data is passed as `initialEvent` to EventDetailClient, which uses it
// to render immediately with no loading skeleton. The client component still runs
// Phase 2 (organizer + related events) client-side since those are secondary.
//
// If the Railway fetch fails (Railway down, event not found, etc.), initialEvent
// is null and EventDetailClient falls back to its normal client-side fetch path.

import EventDetailClient from "./EventDetailClient";

// revalidate=300: Vercel caches this page at the edge for 5 minutes.
// After the first visitor, everyone gets the cached HTML until the timer expires.
export const revalidate = 300;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default async function EventDetailPage({ params }) {
  const { id } = await params;

  let initialEvent = null;
  try {
    const res = await fetch(`${API_URL}/api/events/${id}`, {
      next: { revalidate: 300 },
    });
    if (res.ok) {
      initialEvent = await res.json();
    }
  } catch {
    // Railway unreachable — EventDetailClient will fetch client-side as fallback
  }

  return <EventDetailClient id={id} initialEvent={initialEvent} />;
}
