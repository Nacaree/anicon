// Proxy route handler for GET /api/events/[id].
// Same caching rationale as /api/events/route.js — see that file for details.
// Each event ID gets its own cache entry keyed by the full URL.
export const revalidate = 300;

const RAILWAY_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function GET(request, { params }) {
  const { id } = await params;

  const res = await fetch(`${RAILWAY_URL}/api/events/${id}`, {
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    // Preserve the upstream status (404, 500, etc.) so the frontend
    // can distinguish "event not found" from a server error.
    return Response.json({ error: "Event not found" }, { status: res.status });
  }

  const data = await res.json();
  return Response.json(data);
}
