// Server Component — no "use client".
//
// Intentionally thin: just unwraps params and renders EventDetailClient.
//
// Why NO server-side data fetch here:
// When navigating from the events list page, _eventCache (populated by listEvents())
// already has the event data. A server-side Railway fetch would block the RSC payload
// for ~300–400ms, showing loading.js the entire time — even though the client already
// has the data. Removing the fetch lets the RSC payload return in <50ms (just network
// latency), and EventDetailClient renders instantly from _eventCache.
//
// For direct URL visits (no cache), EventDetailClient falls back to the Vercel proxy
// route (/api/events/[id]), which is edge-cached and typically responds in ~20ms.

import EventDetailClient from "./EventDetailClient";

// revalidate=300: Vercel caches this page shell at the edge for 5 minutes.
export const revalidate = 300;

export default async function EventDetailPage({ params }) {
  const { id } = await params;
  return <EventDetailClient id={id} />;
}
