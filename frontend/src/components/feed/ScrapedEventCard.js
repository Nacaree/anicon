"use client";

import { Globe, MapPin, Calendar, Clock, ExternalLink } from "lucide-react";

/**
 * Display-only card for scraped events in the unified feed.
 * No social interactions (likes/comments/reposts) — just event info + "View Event" CTA.
 * Matches PostCard's container styling for visual consistency in the feed.
 */
export default function ScrapedEventCard({ event }) {
  // Format the event date for display (e.g. "Mar 15, 2026")
  const formattedDate = event.eventDate
    ? new Date(event.eventDate + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  // Format time (e.g. "2:00 PM") — eventTime comes as "HH:mm" or "HH:mm:ss"
  const formattedTime = event.eventTime
    ? formatTime(event.eventTime)
    : null;

  const formattedEndTime = event.endTime
    ? formatTime(event.endTime)
    : null;

  // Human-readable source name for the badge
  const sourceName = SOURCE_LABELS[event.sourcePlatform] || event.sourcePageName || event.sourcePlatform;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 mb-3 overflow-hidden">
      {/* Source badge header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <Globe className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {sourceName}
        </span>
        {formattedDate && (
          <>
            <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {formattedDate}
            </span>
          </>
        )}
      </div>

      {/* Cover image — 16:9 aspect ratio, with fallback placeholder */}
      {event.coverImageUrl ? (
        <div className="relative w-full aspect-[16/9] bg-gray-100 dark:bg-gray-800">
          {/* referrerPolicy prevents external sites from blocking the image via hotlink protection */}
          <img
            src={event.coverImageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => { e.target.style.display = "none"; }}
          />
        </div>
      ) : (
        <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-gray-800 flex items-center justify-center">
          <Calendar className="w-10 h-10 text-orange-300 dark:text-orange-800" />
        </div>
      )}

      {/* Content section */}
      <div className="px-4 py-3 space-y-2">
        {/* Title */}
        <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100 leading-snug">
          {event.title}
        </h3>

        {/* Date + Time row */}
        {(formattedDate || formattedTime) && (
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            {formattedDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formattedDate}
              </span>
            )}
            {formattedTime && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formattedTime}
                {formattedEndTime && ` – ${formattedEndTime}`}
              </span>
            )}
          </div>
        )}

        {/* Location */}
        {event.location && (
          <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
        )}

        {/* Description — truncated to 3 lines */}
        {event.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed">
            {event.description}
          </p>
        )}

        {/* Tags */}
        {event.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {event.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* "View Event" CTA — opens source URL in new tab */}
        <a
          href={event.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 text-sm font-medium
            text-white bg-[#FF7927] rounded-full
            hover:scale-[1.02] active:scale-[0.98] transition-all
            hover:shadow-[0_4px_20px_rgba(255,121,39,0.4)]"
        >
          View Event
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}

/**
 * Human-readable labels for source platforms.
 */
const SOURCE_LABELS = {
  allevents: "AllEvents.in",
  kawaiicon: "KAWAII-CON",
  cjcc: "CJCC",
  bestofpp: "Best of Phnom Penh",
};

/**
 * Format a time string (HH:mm or HH:mm:ss) to 12-hour format (e.g. "2:00 PM").
 */
function formatTime(timeStr) {
  try {
    const [hours, minutes] = timeStr.split(":");
    const h = parseInt(hours, 10);
    const suffix = h >= 12 ? "PM" : "AM";
    const displayHour = h % 12 || 12;
    return `${displayHour}:${minutes} ${suffix}`;
  } catch {
    return timeStr;
  }
}
