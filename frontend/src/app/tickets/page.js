"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/context/AuthContext";
import { ticketApi } from "@/lib/api";

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

function TicketCard({ item }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const isRsvp = item.kind === "rsvp";

  function copyCode() {
    navigator.clipboard.writeText(item.ticketCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Event image */}
      <div className="relative h-36 bg-gradient-to-br from-orange-100 to-orange-200">
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

        {/* Type badge */}
        <div className="absolute top-3 left-3">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/90 text-gray-700 shadow-sm">
            {isRsvp
              ? "Free Entry"
              : item.isFree
                ? "Free"
                : item.ticketPrice
                  ? `$${Number(item.ticketPrice).toFixed(2)}`
                  : "Paid"}
          </span>
        </div>

        {/* Status badge — only for paid tickets */}
        {!isRsvp && (
          <div className="absolute top-3 right-3">
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
        )}

        {/* RSVP going badge */}
        {isRsvp && (
          <div className="absolute top-3 right-3">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700">
              Going
            </span>
          </div>
        )}
      </div>

      {/* Event info */}
      <div className="p-4">
        <h3
          className="font-semibold text-gray-900 text-base leading-tight mb-2 cursor-pointer hover:text-[#FF7927] transition-colors line-clamp-2"
          onClick={() => router.push(`/events/${item.eventId}`)}
        >
          {item.eventTitle}
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

        {/* Ticket code — paid tickets only */}
        {!isRsvp && item.ticketCode && (
          <div className="border-t border-dashed border-gray-200 pt-3">
            <p className="text-xs text-gray-400 mb-1.5">Ticket Code</p>
            <div className="flex items-center justify-between gap-2">
              <code className="text-xs font-mono font-semibold text-gray-700 bg-gray-50 px-2.5 py-1.5 rounded-lg tracking-wider truncate">
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
        )}

        {/* RSVP note */}
        {isRsvp && (
          <div className="border-t border-dashed border-gray-200 pt-3">
            <p className="text-xs text-gray-400">
              You&apos;re on the guest list. Show up and enjoy!
            </p>
          </div>
        )}
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
  // "upcoming" shows eventDate >= today; "past" shows eventDate < today
  const [activeTab, setActiveTab] = useState("upcoming");
  // "all" | "ticket" | "rsvp" — secondary filter within the active tab
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    if (authLoading) return; // Auth not ready yet — wait
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

  // Today's ISO date string (e.g. "2026-03-08") — used to split upcoming vs past.
  // Computed once per render; stable since the page doesn't run past midnight.
  const today = new Date().toISOString().split("T")[0];

  // Apply both the time tab and the type filter chip to the merged items list.
  // No extra fetch needed — all data is already in `items`.
  const displayedItems = items.filter((item) => {
    // Events with no date fall into "upcoming" so they're always visible
    const isUpcoming = !item.eventDate || item.eventDate >= today;
    if (activeTab === "upcoming" && !isUpcoming) return false;
    if (activeTab === "past" && isUpcoming) return false;
    if (activeFilter === "ticket" && item.kind !== "ticket") return false;
    if (activeFilter === "rsvp" && item.kind !== "rsvp") return false;
    return true;
  });

  // Empty state message that reflects the active tab + filter combination
  const emptyMessage =
    activeFilter === "ticket"
      ? "No tickets found."
      : activeFilter === "rsvp"
        ? "No events found."
        : activeTab === "past"
          ? "No past events."
          : "No upcoming events.";

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

          {/* Upcoming / Past tabs — sliding underline indicator.
              Outer div provides the full-width border-b separator.
              Inner inline-flex is only as wide as the two buttons, so the
              indicator (w-1/2) equals exactly one button width and slides
              via translate-x-full when "past" is active. */}
          <div className="border-b border-gray-200 mb-4">
            <div className="relative inline-flex">
              <div
                className={`absolute bottom-0 h-0.5 w-1/2 bg-[#FF7927] transition-transform duration-300 ease-in-out ${
                  activeTab === "past" ? "translate-x-full" : "translate-x-0"
                }`}
              />
              {["upcoming", "past"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-28 pb-3 text-sm font-semibold capitalize transition-colors duration-200 ${
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

          {/* All / Tickets / RSVPs chip filters */}
          <div className="flex gap-2 mb-6">
            {[
              { value: "all", label: "All" },
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

          {loading ? (
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
                animate-in fade-in slide-in-from-bottom-2 duration-200"
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
              <p className="text-gray-500 text-sm mb-6">
                Tickets and Free events will appear here.
              </p>
              <a
                href="/events"
                className="bg-[#FF7927] hover:bg-[#E66B1F] text-white font-semibold px-6 py-2.5 rounded-full
                  transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_4px_20px_rgba(255,121,39,0.4)]
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
                animate-in fade-in slide-in-from-bottom-2 duration-200"
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
