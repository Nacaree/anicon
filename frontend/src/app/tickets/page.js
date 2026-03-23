"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/context/AuthContext";
import {
  ticketApi,
  eventApi,
  normalizeEvent,
  getCachedEvents,
  getCachedTickets,
  setCachedTickets,
} from "@/lib/api";
import { getSavedEventIds, unsaveEvent } from "@/lib/savedEvents";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
              <>
                <span className="text-gray-400 font-bold">•</span>
                <span>{formatTime(item.eventTime)}</span>
              </>
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
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-600">
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
          <button
            onClick={() => router.push(`/events/${item.eventId}`)}
            className="ml-auto text-xs font-semibold px-3 py-1 rounded-full bg-orange-100 text-[#FF7927] hover:bg-orange-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1"
          >
            View Event
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
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
function RsvpCard({ item, onCancel }) {
  const router = useRouter();
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  async function handleCancelRsvp() {
    setCancelLoading(true);
    try {
      await ticketApi.cancelRsvp(item.eventId);
      setCancelModalOpen(false);
      onCancel(item.id);
    } catch {
      // Swallow — the RSVP may have already been removed; either way it's gone
    } finally {
      setCancelLoading(false);
    }
  }

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
              <>
                <span className="text-gray-400 font-bold">•</span>
                <span>{formatTime(item.eventTime)}</span>
              </>
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
        {/* Action row — View Event chip on the left, Cancel RSVP chip on the right */}
        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={() => router.push(`/events/${item.eventId}`)}
            className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1"
          >
            View Event
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
          <button
            onClick={() => setCancelModalOpen(true)}
            className="text-xs font-semibold px-3 py-1 rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Not Going
          </button>
        </div>
      </div>

      {/* Confirmation stub — dashed top border is the tear line; notches bleed outside card */}
      <div className="relative px-4 pb-4 pt-3 bg-emerald-50/40 rounded-b-2xl flex items-start gap-2.5 border-t-2 border-dashed border-emerald-200 mt-1">
        <div
          className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-gray-50 border-2 border-emerald-200 z-10"
          style={{ clipPath: "inset(0 0 0 46%)" }}
        />
        <div
          className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-gray-50 border-2 border-emerald-200 z-10"
          style={{ clipPath: "inset(0 46% 0 0)" }}
        />
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
        <div className="flex-1">
          <p className="text-xs font-semibold text-emerald-700">
            You&apos;re on the guest list!
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Show up and enjoy the event
          </p>
        </div>
      </div>

      {/* Cancel RSVP confirmation modal */}
      <Dialog
        open={cancelModalOpen}
        onOpenChange={(open) => {
          if (!cancelLoading) setCancelModalOpen(open);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Not going ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            You&apos;ll be removed from the guest list for now. You can always
            return later.
          </p>
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => setCancelModalOpen(false)}
              disabled={cancelLoading}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-full
                transition-all duration-300 hover:scale-[1.02]
                hover:shadow-[0_4px_20px_rgba(255,121,39,0.4)] active:scale-[0.98]
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Stay on the list
            </button>
            <button
              onClick={handleCancelRsvp}
              disabled={cancelLoading}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-full
                transition-all duration-300 hover:scale-[1.02]
                hover:shadow-[0_4px_20px_rgba(239,68,68,0.4)] active:scale-[0.98]
                disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {cancelLoading ? "Removing..." : "I'm not going"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Dispatcher — renders the correct card type based on item.kind.
function TicketCard({ item, onCancel }) {
  if (item.kind === "rsvp") return <RsvpCard item={item} onCancel={onCancel} />;
  return <PaidTicketCard item={item} />;
}

// ─── Horizontal / List view ───────────────────────────────────────────────────
// Eventbrite-inspired: thumbnail strip on left, event info in center,
// vertical dashed tear line, ticket stub on right.
// Outer div has NO overflow-hidden so the notch circles bleed outside the card edge.

function PaidTicketRow({ item }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(item.ticketCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="bg-white rounded-xl shadow-sm relative hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:min-h-[180px]">
      {/* Left image strip — stacks on top on mobile, left side on desktop */}
      <div className="relative w-full sm:w-56 md:w-72 h-40 sm:h-auto shrink-0 rounded-t-xl sm:rounded-t-none sm:rounded-l-xl overflow-hidden bg-gradient-to-br from-orange-100 to-orange-200">
        {item.eventCoverImageUrl ? (
          <img
            src={item.eventCoverImageUrl}
            alt={item.eventTitle}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-7 h-7 text-orange-300"
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

      {/* Main info — justify-between spreads content top-to-bottom, filling the card height */}
      <div className="flex-1 p-5 min-w-0 flex flex-col justify-center gap-3">
        <h3
          className="font-semibold text-gray-900 text-base leading-tight cursor-pointer hover:text-[#FF7927] transition-colors line-clamp-2"
          onClick={() => router.push(`/events/${item.eventId}`)}
        >
          {item.eventTitle}
        </h3>
        <div className="flex flex-col gap-1.5 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <svg
              className="w-3.5 h-3.5 shrink-0"
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
              <>
                <span className="text-gray-400 font-bold">•</span>
                <span>{formatTime(item.eventTime)}</span>
              </>
            )}
          </div>
          {item.eventLocation && (
            <div className="flex items-center gap-2">
              <svg
                className="w-3.5 h-3.5 shrink-0"
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-600">
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
          <button
            onClick={() => router.push(`/events/${item.eventId}`)}
            className="text-xs font-bold px-3 py-1 rounded-full bg-orange-100 text-[#FF7927] hover:bg-orange-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1"
          >
            View Event
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Vertical tear separator — notches bleed above/below the card.
          self-stretch fills the full row height; notches at -top-3/-bottom-3
          replicate the punched-hole effect used in PaidTicketCard. */}
      {item.ticketCode && (
        <div className="relative self-stretch w-6 shrink-0 hidden sm:block">
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-gray-50 border-2 border-gray-200 z-10"
            style={{ clipPath: "inset(46% 0 0 0)" }}
          />
          <div className="absolute inset-y-0 left-1/2 border-l-2 border-dashed border-gray-200" />
          <div
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-gray-50 border-2 border-gray-200 z-10"
            style={{ clipPath: "inset(0 0 46% 0)" }}
          />
        </div>
      )}

      {/* Ticket stub — wide enough to show the full code without truncation */}
      {item.ticketCode && (
        <div className="bg-gray-50/60 rounded-b-xl sm:rounded-b-none sm:rounded-r-xl px-4 py-4 flex flex-col justify-center items-center gap-2 w-full sm:w-28 md:w-48 shrink-0">
          <p className="text-xs text-gray-400 uppercase tracking-wider">
            Ticket Code
          </p>
          <code className="text-xs font-mono font-semibold text-gray-700 bg-white px-3 py-1.5 rounded-lg border border-gray-100 tracking-wide text-center w-full break-all">
            {item.ticketCode}
          </code>
          <button
            onClick={copyCode}
            className="text-sm text-[#FF7927] hover:text-[#E66B1F] font-medium transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}

function RsvpRow({ item, onCancel }) {
  const router = useRouter();
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  async function handleCancelRsvp() {
    setCancelLoading(true);
    try {
      await ticketApi.cancelRsvp(item.eventId);
      setCancelModalOpen(false);
      onCancel(item.id);
    } catch {
      // Swallow — the RSVP may have already been removed; either way it's gone
    } finally {
      setCancelLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm relative hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:min-h-45">
      {/* Left image strip — stacks on top on mobile, left side on desktop */}
      <div className="relative w-full sm:w-56 md:w-72 h-40 sm:h-auto shrink-0 rounded-t-xl sm:rounded-t-none sm:rounded-l-xl overflow-hidden bg-linear-to-br from-emerald-50 to-teal-50">
        {item.eventCoverImageUrl ? (
          <img
            src={item.eventCoverImageUrl}
            alt={item.eventTitle}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-7 h-7 text-emerald-200"
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

      {/* Main info — flex-col with equal gap-3 between every element */}
      <div className="flex-1 p-5 min-w-0 flex flex-col justify-center gap-3">
        <h3
          className="font-semibold text-gray-900 text-base leading-tight cursor-pointer hover:text-emerald-600 transition-colors line-clamp-1"
          onClick={() => router.push(`/events/${item.eventId}`)}
        >
          {item.eventTitle}
        </h3>
        <div className="flex flex-col gap-1.5 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <svg
              className="w-3.5 h-3.5 shrink-0"
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
              <>
                <span className="text-gray-400 font-bold">•</span>
                <span>{formatTime(item.eventTime)}</span>
              </>
            )}
          </div>
          {item.eventLocation && (
            <div className="flex items-center gap-2">
              <svg
                className="w-3.5 h-3.5 shrink-0"
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
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
            Free Entry
          </span>
          <button
            onClick={() => router.push(`/events/${item.eventId}`)}
            className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1"
          >
            View Event
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Guest pass stub — dashed left border is the tear line; notches bleed outside card */}
      <div className="relative bg-emerald-50/40 rounded-b-xl sm:rounded-b-none sm:rounded-r-xl px-4 py-4 flex flex-col justify-center items-center gap-2 w-full sm:w-28 md:w-48 shrink-0 sm:border-l-2 border-t-2 sm:border-t-0 border-dashed border-emerald-200">
        <div
          className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-gray-50 border-2 border-emerald-200 z-10 hidden sm:block"
          style={{ clipPath: "inset(46% 0 0 0)" }}
        />
        <div
          className="absolute -bottom-3 -left-3 w-6 h-6 rounded-full bg-gray-50 border-2 border-emerald-200 z-10 hidden sm:block"
          style={{ clipPath: "inset(0 0 46% 0)" }}
        />
        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-emerald-600"
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
        <p className="text-sm font-semibold text-emerald-700 text-center leading-tight">
          You&apos;re going!
        </p>
        {/* Cancel RSVP — opens confirmation modal */}
        <button
          onClick={() => setCancelModalOpen(true)}
          className="text-xs font-semibold px-3 py-1 rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          Not Going
        </button>
      </div>

      {/* Cancel RSVP confirmation modal */}
      <Dialog
        open={cancelModalOpen}
        onOpenChange={(open) => {
          if (!cancelLoading) setCancelModalOpen(open);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Not going?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            You&apos;ll be removed from the guest list. You can always join
            again later.
          </p>
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => setCancelModalOpen(false)}
              disabled={cancelLoading}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-full
                transition-all duration-300 hover:scale-[1.02]
                hover:shadow-[0_4px_20px_rgba(255,121,39,0.4)] active:scale-[0.98]
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Stay on the list
            </button>
            <button
              onClick={handleCancelRsvp}
              disabled={cancelLoading}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-full
                transition-all duration-300 hover:scale-[1.02]
                hover:shadow-[0_4px_20px_rgba(239,68,68,0.4)] active:scale-[0.98]
                disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {cancelLoading ? "Removing..." : "I'm not going"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Dispatcher for list/row view.
function TicketRow({ item, onCancel }) {
  if (item.kind === "rsvp") return <RsvpRow item={item} onCancel={onCancel} />;
  return <PaidTicketRow item={item} />;
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
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Event image — absolute-positioned img ensures it fills the container */}
      <div className="relative h-40 bg-gradient-to-br from-orange-100 to-orange-200">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="absolute inset-0 w-full h-full object-cover"
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
      </div>

      {/* Event info */}
      <div className="p-4">
        <h3
          className="font-semibold text-gray-900 text-base leading-tight mb-2 cursor-pointer hover:text-[#FF7927] transition-colors line-clamp-2"
          onClick={() => router.push(`/events/${event.id}`)}
        >
          {event.title}
        </h3>

        <div className="space-y-1.5 mb-3">
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
              <>
                <span className="text-gray-400 font-bold">•</span>
                <span>{event.time}</span>
              </>
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

        {/* Price chip + saved badge */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              event.isFree
                ? "bg-green-100 text-green-700"
                : "bg-rose-100 text-rose-600"
            }`}
          >
            {event.isFree
              ? "Free Entry"
              : event.ticketPrice
                ? `$${Number(event.ticketPrice).toFixed(2)}`
                : "Paid"}
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-[#FF7927]">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
            </svg>
            Saved
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 border-t border-dashed border-gray-200 pt-3">
          <button
            onClick={() => router.push(`/events/${event.id}`)}
            className="flex-1 text-xs font-bold py-2 px-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            View Event
          </button>
          <button
            onClick={handleUnsave}
            className="text-xs font-medium py-2 px-3 rounded-full border border-gray-200 text-gray-500 hover:border-rose-300 hover:text-rose-500 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Remove
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
  // "all" | "ticket" | "rsvp" — secondary filter within upcoming/past tabs only.
  // Defaults to "all" so search across both types works out of the box (e.g. typing "free").
  const [activeFilter, setActiveFilter] = useState("all");
  // "grid" = card grid (default), "list" = horizontal Eventbrite-style rows
  const [viewMode, setViewMode] = useState("grid");
  // Search query — filters displayed items by title, location, or ticket code
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef(null);


  // Cmd/Ctrl+K focuses the search input from anywhere on the page
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Saved tab state — fetched lazily on first open, then kept in memory
  const [savedEvents, setSavedEvents] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedLoaded, setSavedLoaded] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    // Fast path: use cached tickets from a previous visit (instant render).
    const cached = getCachedTickets();
    if (cached) {
      setItems(cached);
      setLoading(false);
      return;
    }

    // Cold path: fetch from API, merge, cache for next visit.
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
        setCachedTickets(merged);
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

  // Called by RsvpCard/RsvpRow when the user cancels their RSVP —
  // removes the item from the merged list immediately without a full refetch.
  function handleCancelRsvp(rsvpId) {
    setItems((prev) => prev.filter((i) => i.id !== rsvpId));
  }

  const today = new Date().toISOString().split("T")[0];

  // matchesSearch — rich search across all available fields on a ticket/rsvp/saved-event item.
  // Builds a haystack string from title, location, ticketCode, ticket status (normalized),
  // a "free" token for free events, and full date parts (month name, year, day-of-week).
  // Uses word-by-word matching: every space-separated word in q must appear somewhere in
  // the haystack, making multi-word queries work and providing fuzzy tolerance for partial input.
  function matchesSearch(item, q) {
    if (!q) return true;

    const parts = [
      item.eventTitle,
      item.eventLocation,
      item.ticketCode,
      item.title,    // saved events use `title` not `eventTitle`
      item.location, // saved events use `location` not `eventLocation`
    ];

    // Normalize ticket status so "checked in" matches "checked_in"
    if (item.status) parts.push(item.status.replace(/_/g, " "));

    // Add "free" to haystack so typing "free" matches free tickets and all RSVPs
    if (item.isFree || item.kind === "rsvp") parts.push("free");

    // Date parts — eventDate is "2026-03-15" on both ticket/rsvp items and normalized saved events
    if (item.eventDate) {
      const d = new Date(item.eventDate + "T00:00:00");
      parts.push(
        d.toLocaleDateString("en-US", { month: "long" }),    // "March"
        d.toLocaleDateString("en-US", { month: "short" }),   // "Mar"
        String(d.getFullYear()),                              // "2026"
        d.toLocaleDateString("en-US", { weekday: "long" }),  // "Saturday"
        d.toLocaleDateString("en-US", { weekday: "short" }), // "Sat"
        item.eventDate,                                       // "2026-03-15"
      );
    }

    // Time — raw backend value is "10:10:00" so "10:10" is a natural substring match;
    // also include the formatted display string (e.g. "10 AM", "10:10 AM") for saved events
    if (item.eventTime) parts.push(item.eventTime); // "10:10:00"
    if (item.time) parts.push(item.time);           // "10 AM" (normalized saved events)

    const haystack = parts.filter(Boolean).join(" ").toLowerCase();

    // Require every word in the query to appear somewhere in the combined haystack
    return q.split(/\s+/).filter(Boolean).every((word) => haystack.includes(word));
  }

  const q = searchQuery.toLowerCase().trim();
  const displayedItems = items.filter((item) => {
    const isUpcoming = !item.eventDate || item.eventDate >= today;
    if (activeTab === "upcoming" && !isUpcoming) return false;
    if (activeTab === "past" && isUpcoming) return false;
    if (activeFilter === "ticket" && item.kind !== "ticket") return false;
    if (activeFilter === "rsvp" && item.kind !== "rsvp") return false;
    if (!matchesSearch(item, q)) return false;
    return true;
  });

  // Apply same rich search to saved events (matchesSearch handles both field name shapes)
  const displayedSavedEvents = savedEvents.filter((e) => matchesSearch(e, q));

  const emptyMessage =
    activeTab === "saved"
      ? "No saved events yet."
      : activeFilter === "ticket"
        ? "No tickets found."
        : activeFilter === "rsvp"
          ? "No free events found."
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
        } pt-16 pb-16 md:pb-0 transition-all duration-300`}
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
                  className={`w-24 pb-3 text-sm font-semibold capitalize transition-colors duration-300 ${
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

          {/* Search bar — filters across title, location, ticket code. Cmd/Ctrl+K to focus. */}
          <div className="relative mb-4">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
              />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search events, dates, status, "free"… (⌘K)'
              className="w-full pl-9 pr-9 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7927]/30 focus:border-[#FF7927] transition-colors placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear search"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Tickets / Free chip filters + grid/list view toggle — hidden on the Saved tab. */}
          {activeTab !== "saved" && (
            <div className="flex items-center gap-3 mb-6">
              {/* Filter chips */}
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

              {/* Divider between filter chips and view toggle */}
              <div className="w-px h-5 bg-gray-200" />

              {/* View mode toggle — grid icon / list icon */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === "grid"
                      ? "bg-white shadow-sm text-[#FF7927]"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                  aria-label="Grid view"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    viewBox="0 0 24 24"
                  >
                    <rect x="3" y="3" width="7" height="7" rx="1.5" />
                    <rect x="14" y="3" width="7" height="7" rx="1.5" />
                    <rect x="3" y="14" width="7" height="7" rx="1.5" />
                    <rect x="14" y="14" width="7" height="7" rx="1.5" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === "list"
                      ? "bg-white shadow-sm text-[#FF7927]"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                  aria-label="List view"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    viewBox="0 0 24 24"
                  >
                    <rect x="3" y="4" width="8" height="5" rx="1.5" />
                    <line x1="14" y1="6.5" x2="21" y2="6.5" />
                    <rect x="3" y="13" width="8" height="5" rx="1.5" />
                    <line x1="14" y1="15.5" x2="21" y2="15.5" />
                  </svg>
                </button>
              </div>

              {/* Result count — only shown when a search query is active */}
              {q && (
                <span className="text-xs text-gray-400">
                  {displayedItems.length} result
                  {displayedItems.length !== 1 ? "s" : ""}
                </span>
              )}
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
            ) : displayedSavedEvents.length === 0 ? (
              <div
                key="saved-empty"
                className="flex flex-col items-center justify-center py-24 text-center
                  animate-in fade-in slide-in-from-bottom-2 duration-300"
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
                  {q ? `No results for "${searchQuery}"` : emptyMessage}
                </h2>
                <p className="text-gray-500 text-sm mb-6">
                  {q ? "Try a different search term." : emptySubMessage}
                </p>
                {q ? (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-2.5 rounded-full transition-colors text-sm"
                  >
                    Clear search
                  </button>
                ) : (
                  <a
                    href="/events"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-2.5 rounded-full
                      transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_4px_20px_rgba(255,121,39,0.4)]
                      active:scale-[0.98] text-sm"
                  >
                    Browse Events
                  </a>
                )}
              </div>
            ) : (
              <div
                key="saved-grid"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4
                  animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                {displayedSavedEvents.map((event) => (
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
                animate-in fade-in slide-in-from-bottom-2 duration-300"
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
                {q ? `No results for "${searchQuery}"` : emptyMessage}
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                {q ? "Try a different search term." : emptySubMessage}
              </p>
              {q ? (
                <button
                  onClick={() => setSearchQuery("")}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-2.5 rounded-full transition-colors text-sm"
                >
                  Clear search
                </button>
              ) : (
                <a
                  href="/events"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-2.5 rounded-full
                    transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_4px_20px_rgba(255,121,39,0.4)]
                    active:scale-[0.98] text-sm"
                >
                  Browse Events
                </a>
              )}
            </div>
          ) : viewMode === "list" ? (
            // List view — horizontal Eventbrite-style rows, single column
            <div
              key={`${activeTab}-${activeFilter}-list`}
              className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-4xl mx-auto"
            >
              {displayedItems.map((item) => (
                <TicketRow
                  key={`${item.kind}-${item.id}`}
                  item={item}
                  onCancel={handleCancelRsvp}
                />
              ))}
            </div>
          ) : (
            // Grid view (default) — card grid
            <div
              key={`${activeTab}-${activeFilter}-grid`}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4
                animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              {displayedItems.map((item) => (
                <TicketCard
                  key={`${item.kind}-${item.id}`}
                  item={item}
                  onCancel={handleCancelRsvp}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
