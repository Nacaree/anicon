// Server Component — thin wrapper that unwraps params and renders EventDetailClient.
// No data fetching here — card links use prefetch={true} so the RSC payload is
// already cached by the time the user clicks, making navigation instant.

import EventDetailClient from "./EventDetailClient";

export const revalidate = 300;

export default async function EventDetailPage({ params }) {
  const { id } = await params;
  return <EventDetailClient id={id} />;
}
