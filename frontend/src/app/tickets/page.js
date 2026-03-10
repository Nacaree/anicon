"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/context/AuthContext";
import {
  ticketApi,
  eventApi,
  normalizeEvent,
  getCachedEvents,
} from "@/lib/api";
import { getSavedEventIds, unsaveEvent } from "@/lib/savedEvents";

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const date = new Date();
  date.setHours(parseInt(h, 10), parseInt(m, 10));
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

// Paid ticket card — Eventbrite-inspired physical ticket design.
// Key signature: circular notches on the sides of a dashed tear line,
// separating the event info from the ticket code stub at the bottom.
// NOTE: outer div has NO overflow-hidden so the notch circles can bleed
// outside the card edge. The image gets its own overflow-hidden instead.
function PaidTicketCard({ item }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(item.ticketCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm relative hover:shadow-md transition-shadow">
      {/* Image — own overflow-hidden + rounded top corners */}
      <div className="relative h-56 rounded-t-2xl overflow-hidden bg-gradient-to-br from-orange-100 to-orange-200">
        {item.eventCoverImageUrl ? (
          <img
            src={item.eventCoverImageUrl}
            alt={item.eventTitle}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-orange-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
              />
            </svg>
          </div>
        )}

      </div>

      {/* Event info */}
      <div className="px-4 pt-3 pb-2">
        <h3
          className="font-semibold text-gray-900 text-base leading-tight mb-2 cursor-pointer hover:text-[#FF7927] transition-colors line-clamp-2"
          onClick={() => router.push(`/events/${item.eventId}`)}
        >
          {item.eventTitle}
        </h3>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg
              className="w-4 h-4 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>{formatDate(item.eventDate)}</span>
            {item.eventTime && (
              <span className="text-gray-400">
                · {formatTime(item.eventTime)}
              </span>
            )}
          </div>
          {item.eventLocation && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="truncate">{item.eventLocation}</span>
            </div>
          )}
        </div>

        {/* Price + status chips — moved out of the image and into the info section */}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
            {item.isFree
              ? "Free"
              : item.ticketPrice
                ? `$${Number(item.ticketPrice).toFixed(2)}`
                : "Paid"}
          </span>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              item.status === "checked_in"
                ? "bg-blue-100 text-blue-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {item.status === "checked_in" ? "Checked In" : "Issued"}
          </span>
        </div>
      </div>

      {/* Tear line with circular notches — only shown when there's a ticket code.
          Notch circles use -left-3 / -right-3 to bleed outside the card border,
          mimicking the punched holes on a physical event ticket. */}
      {item.ticketCode && (
        <>
          {/* Tear line with half-bordered notches. Each circle has a full border + overflow-hidden,
              then an inner div covering the outer half with the page bg color — this hides the
              outer arc of the border so only the inner arc (visible against the white card) shows. */}
          {/* clip-path slices each circle in half — inset(0 0 0 50%) keeps right half only,
              inset(0 50% 0 0) keeps left half only. clip-path clips the border too, unlike overflow-hidden. */}
          <div className="relative h-6 flex items-center mt-1">
            <div
              className="absolute -left-3 w-6 h-6 rounded-full bg-gray-50 border-2 border-gray-200 z-10"
              style={{ clipPath: "inset(0 0 0 46%)" }}
            />
            <div className="flex-1 border-t-2 border-dashed border-gray-200 mx-4" />
            <div
              className="absolute -right-3 w-6 h-6 rounded-full bg-gray-50 border-2 border-gray-200 z-10"
              style={{ clipPath: "inset(0 46% 0 0)" }}
            />
          </div>

          {/* Ticket stub */}
          <div className="px-4 pb-4 pt-2 bg-gray-50/50 rounded-b-2xl">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1.5">
              Ticket Code
            </p>
            <div className="flex items-center justify-between gap-2">
              <code className="text-xs font-mono font-semibold text-gray-700 bg-white px-3 py-1.5 rounded-lg border border-gray-100 tracking-wider truncate flex-1">
                {item.ticketCode}
              </code>
              <button
                onClick={copyCode}
                className="shrink-0 text-xs text-[#FF7927] hover:text-[#E66B1F] font-medium transition-colors"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Free RSVP card — "Guest Pass" wristband aesthetic.
// Distinct from paid tickets: emerald/teal header band, green tear line,
// and a confirmation stub instead of a ticket code.
// Same notch trick as PaidTicketCard — no overflow-hidden on outer div.
function RsvpCard({ item }) {
  const router = useRouter();

  return (
    <div className="bg-white rounded-2xl shadow-sm relative hover:shadow-md transition-shadow">
      {/* Wristband header band */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-400 rounded-t-2xl px-4 py-2 flex items-center gap-2">
        {/* Ticket icon */}
        <svg
          className="w-3.5 h-3.5 text-white shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
          />
        </svg>
        <span className="text-white font-bold text-sm tracking-wider uppercase">
          Free Entry
        </span>
      </div>

      {/* Image — no top rounding since the header band sits above */}
      <div className="relative h-52 overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50">
        {item.eventCoverImageUrl ? (
          <img
            src={item.eventCoverImageUrl}
            alt={item.eventTitle}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-emerald-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Event info */}
      <div className="px-4 pt-3 pb-2">
        <h3
          className="font-semibold text-gray-900 text-base leading-tight mb-2 cursor-pointer hover:text-emerald-600 transition-colors line-clamp-2"
          onClick={() => router.push(`/events/${item.eventId}`)}
        >
          {item.eventTitle}
        </h3>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg
              className="w-4 h-4 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>{formatDate(item.eventDate)}</span>
            {item.eventTime && (
              <span className="text-gray-400">
                · {formatTime(item.eventTime)}
              </span>
            )}
          </div>
          {item.eventLocation && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="truncate">{item.eventLocation}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tear line — emerald tint, same half-border notch technique as PaidTicketCard */}
      <div className="relative h-6 flex items-center mt-1">
        <div
          className="absolute -left-3 w-6 h-6 rounded-full bg-gray-50 border-2 border-emerald-200 z-10"
          style={{ clipPath: "inset(0 0 0 46%)" }}
        />
        <div className="flex-1 border-t-2 border-dashed border-emerald-200 mx-4" />
        <div
          className="absolute -right-3 w-6 h-6 rounded-full bg-gray-50 border-2 border-emerald-200 z-10"
          style={{ clipPath: "inset(0 46% 0 0)" }}
        />
      </div>

      {/* Confirmation stub */}
      <div className="px-4 pb-4 pt-2 bg-emerald-50/40 rounded-b-2xl flex items-start gap-2.5">
        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
          <svg
            className="w-3 h-3 text-emerald-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <div>
          <p className="text-xs font-semibold text-emerald-700">
            You&apos;re on the guest list!
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Show up and enjoy the event
          </p>
        </div>
      </div>
    </div>
  );
}

// Dispatcher — renders the correct card type based on item.kind.
function TicketCard({ item }) {
  if (item.kind === "rsvp") return <RsvpCard item={item} />;
  return <PaidTicketCard item={item} />;
}

// Card for a bookmarked/saved event — simpler than TicketCard since there's no
// ticket code or RSVP status, just event info + an unsave action.
function SavedEventCard({ event, onUnsave }) {
  const router = useRouter();

  function handleUnsave() {
    unsaveEvent(event.id);
    onUnsave(event.id);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Event image */}
      <div className="relative h-36 bg-gradient-to-br from-orange-100 to-orange-200">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-orange-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Saved bookmark badge */}
        <div className="absolute top-3 right-3">
          <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#FF7927]/90 text-white shadow-sm">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
            </svg>
            Saved
          </span>
        </div>

        {/* Free/Paid badge */}
        <div className="absolute top-3 left-3">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/90 text-gray-700 shadow-sm">
            {event.isFree
              ? "Free Entry"
              : event.ticketPrice
                ? `$${Number(event.ticketPrice).toFixed(2)}`
                : "Paid"}
          </span>
        </div>
      </div>

      {/* Event info */}
      <div className="p-4">
        <h3
          className="font-semibold text-gray-900 text-base leading-tight mb-2 cursor-pointer hover:text-[#FF7927] transition-colors line-clamp-2"
          onClick={() => router.push(`/events/${event.id}`)}
        >
          {event.title}
        </h3>

        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg
              className="w-4 h-4 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {/* event.date and event.time come pre-formatted from normalizeEvent —
                do NOT wrap in formatDate()/formatTime() again or they'll produce garbage */}
            <span>{event.date}</span>
            {event.time && (
              <span className="text-gray-400">· {event.time}</span>
            )}
          </div>
          {event.location && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </div>

        {/* Unsave button */}
        <div className="border-t border-dashed border-gray-200 pt-3">
          <button
            onClick={handleUnsave}
            className="w-full text-xs font-medium py-2 px-3 rounded-full border border-gray-200 text-gray-500 hover:border-rose-300 hover:text-rose-500 transition-colors duration-300"
          >
            Remove from Saved
          </button>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse">
      <div className="h-36 bg-gray-100" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-100 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-3 bg-gray-100 rounded w-2/3" />
        <div className="border-t border-dashed border-gray-200 pt-3">
          <div className="h-8 bg-gray-100 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// Maps tab name → its 0-based index, used to compute the sliding underline offset.
// With 3 tabs the indicator is w-1/3 and translates by 100% per step.
const TAB_INDEX = { upcoming: 0, past: 1, saved: 2 };

export default function MyTicketsPage() {
  const { isSidebarCollapsed } = useSidebar();
  // Wait for auth to finish initializing before fetching.
  // Ticket endpoints require a valid bearer token — if we call them while
  // AuthContext is still running getSession() (e.g. refreshing an expired token),
  // the concurrent getSession() call in getAuthHeaders() can block indefinitely.
  // Once isLoading is false, the session is cached and getSession() returns instantly.
  const { isLoading: authLoading } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // "upcoming" shows eventDate >= today; "past" shows eventDate < today; "saved" shows bookmarks
  const [activeTab, setActiveTab] = useState("upcoming");
  // "ticket" | "rsvp" — secondary filter within upcoming/past tabs only.
  // Defaults to "ticket" so the user sees paid tickets first (no "All" option).
  const [activeFilter, setActiveFilter] = useState("ticket");

  // Saved tab state — fetched lazily on first open, then kept in memory
  const [savedEvents, setSavedEvents] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedLoaded, setSavedLoaded] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    Promise.all([ticketApi.myTickets(), ticketApi.myRsvps()])
      .then(([tickets, rsvps]) => {
        const ticketItems = tickets.map((t) => ({ ...t, kind: "ticket" }));
        const rsvpItems = rsvps.map((r) => ({ ...r, kind: "rsvp" }));
        // Merge and sort by event date ascending (soonest first)
        const merged = [...ticketItems, ...rsvpItems].sort((a, b) => {
          if (!a.eventDate) return 1;
          if (!b.eventDate) return -1;
          return a.eventDate.localeCompare(b.eventDate);
        });
        setItems(merged);
      })
      .catch(() => setError("Failed to load tickets. Please try again."))
      .finally(() => setLoading(false));
  }, [authLoading]);

  // Load saved events lazily when the Saved tab is first opened.
  // Uses getCachedEvents() (warm if navigated from the events page) and falls
  // back to a full listEvents() fetch so the tab also works on direct visits.
  useEffect(() => {
    if (activeTab !== "saved" || savedLoaded) return;

    setSavedLoading(true);
    const ids = getSavedEventIds();

    const cached = getCachedEvents();
    if (cached && cached.length > 0) {
      // getCachedEvents() returns raw backend events — must normalize before
      // SavedEventCard can access imageUrl, date, time fields.
      setSavedEvents(cached.filter((e) => ids.has(e.id)).map(normalizeEvent));
      setSavedLoading(false);
      setSavedLoaded(true);
    } else {
      eventApi
        .listEvents()
        .then((data) => {
          const all = data.map(normalizeEvent);
          setSavedEvents(all.filter((e) => ids.has(e.id)));
        })
        .catch(() => setSavedEvents([]))
        .finally(() => {
          setSavedLoading(false);
          setSavedLoaded(true);
        });
    }
  }, [activeTab, savedLoaded]);

  // Called by SavedEventCard when the user removes a bookmark —
  // removes it from local state immediately without a full refetch.
  function handleUnsave(eventId) {
    setSavedEvents((prev) => prev.filter((e) => e.id !== eventId));
  }

  const today = new Date().toISOString().split("T")[0];

  const displayedItems = items.filter((item) => {
    const isUpcoming = !item.eventDate || item.eventDate >= today;
    if (activeTab === "upcoming" && !isUpcoming) return false;
    if (activeTab === "past" && isUpcoming) return false;
    if (activeFilter === "ticket" && item.kind !== "ticket") return false;
    if (activeFilter === "rsvp" && item.kind !== "rsvp") return false;
    return true;
  });

  const emptyMessage =
    activeTab === "saved"
      ? "No saved events yet."
      : activeFilter === "ticket"
        ? "No tickets found."
        : activeFilter === "rsvp"
          ? "No events found."
          : activeTab === "past"
            ? "No past events."
            : "No upcoming events.";

  const emptySubMessage =
    activeTab === "saved"
      ? "Save events from the events page to find them here."
      : "Tickets and free events will appear here.";

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />

      <div
        className={`${
          isSidebarCollapsed ? "md:ml-20" : "md:ml-64"
        } pt-16 transition-all duration-300`}
      >
        <div className="px-4 sm:px-6 md:px-8 py-8 max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">My Tickets</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">
              {error}
            </div>
          )}

          {/* Upcoming / Past / Saved tabs — sliding underline indicator.
              3 tabs: indicator is w-1/3 and translates by 100% per tab index.
              TAB_INDEX maps each name to its 0-based position for the inline transform. */}
          <div className="border-b border-gray-200 mb-4">
            <div className="relative inline-flex">
              <div
                className="absolute bottom-0 h-0.5 w-1/3 bg-[#FF7927] transition-transform duration-300 ease-in-out"
                style={{
                  transform: `translateX(${TAB_INDEX[activeTab] * 100}%)`,
                }}
              />
              {["upcoming", "past", "saved"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-24 pb-3 text-sm font-semibold capitalize transition-colors duration-400 ${
                    activeTab === tab
                      ? "text-[#FF7927]"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Tickets / Free chip filters — hidden on the Saved tab.
              "All" removed: default is "ticket" so users see their tickets first. */}
          {activeTab !== "saved" && (
            <div className="flex gap-2 mb-6">
              {[
                { value: "ticket", label: "Tickets" },
                { value: "rsvp", label: "Free" },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setActiveFilter(f.value)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    activeFilter === f.value
                      ? "bg-[#FF7927] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* ── Saved tab ── */}
          {activeTab === "saved" ? (
            savedLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : savedEvents.length === 0 ? (
              <div
                key="saved-empty"
                className="flex flex-col items-center justify-center py-24 text-center
                  animate-in fade-in slide-in-from-bottom-2 duration-400"
              >
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-8 h-8 text-[#FF7927]"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                  {emptyMessage}
                </h2>
                <p className="text-gray-500 text-sm mb-6">{emptySubMessage}</p>
                <a
                  href="/events"
                  className="bg-[#FF7927] hover:bg-[#E66B1F] text-white font-semibold px-6 py-2.5 rounded-full
                    transition-all duration-400 hover:scale-[1.03] hover:shadow-[0_4px_20px_rgba(255,121,39,0.4)]
                    active:scale-[0.98] text-sm"
                >
                  Browse Events
                </a>
              </div>
            ) : (
              <div
                key="saved-grid"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4
                  animate-in fade-in slide-in-from-bottom-2 duration-400"
              >
                {savedEvents.map((event) => (
                  <SavedEventCard
                    key={event.id}
                    event={event}
                    onUnsave={handleUnsave}
                  />
                ))}
              </div>
            )
          ) : /* ── Upcoming / Past tabs ── */
          loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : displayedItems.length === 0 ? (
            // key forces remount on tab/filter change → triggers fade-in animation
            <div
              key={`${activeTab}-${activeFilter}`}
              className="flex flex-col items-center justify-center py-24 text-center
                animate-in fade-in slide-in-from-bottom-2 duration-400"
            >
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-[#FF7927]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                {emptyMessage}
              </h2>
              <p className="text-gray-500 text-sm mb-6">{emptySubMessage}</p>
              <a
                href="/events"
                className="bg-[#FF7927] hover:bg-[#E66B1F] text-white font-semibold px-6 py-2.5 rounded-full
                  transition-all duration-400 hover:scale-[1.03] hover:shadow-[0_4px_20px_rgba(255,121,39,0.4)]
                  active:scale-[0.98] text-sm"
              >
                Browse Events
              </a>
            </div>
          ) : (
            // key forces remount on tab/filter change → triggers fade-in animation
            <div
              key={`${activeTab}-${activeFilter}`}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4
                animate-in fade-in slide-in-from-bottom-2 duration-400"
            >
              {displayedItems.map((item) => (
                <TicketCard key={`${item.kind}-${item.id}`} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
