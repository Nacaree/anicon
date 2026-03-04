"use client";

import Link from "next/link";

export default function TrendingEvent({ event = null, loading = false }) {
  // Skeleton
  if (loading || !event) {
    return (
      <section>
        <div className="relative md:py-5">
          <div className="hidden md:block absolute top-5 bottom-5 left-0 right-0 bg-gray-200 rounded-2xl translate-x-2 translate-y-2" />
          <div className="relative bg-gray-100 rounded-2xl border border-gray-200 flex flex-col md:min-h-65 animate-pulse">
            <div className="w-full h-64 bg-gray-200 rounded-t-2xl md:hidden" />
            <div className="flex-1 p-5 sm:p-6 md:pl-[54%] flex flex-col gap-4">
              <div className="h-4 w-28 bg-gray-200 rounded" />
              <div className="h-6 w-3/4 bg-gray-200 rounded" />
              <div className="h-4 w-1/2 bg-gray-200 rounded" />
              <div className="flex gap-2 mt-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-6 w-16 bg-gray-200 rounded-full" />
                ))}
              </div>
              <div className="h-9 w-28 bg-gray-200 rounded-full mt-auto" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      {/* Trending Event section label removed — kept as comment for reference */}

      {/* Outer wrapper — md:py-3 creates 12px overflow space so the image can
          extend past the card edges on desktop without being clipped. */}
      <div className="relative md:py-3">
        {/* Depth shadow — sits behind the main card, shifted right+down.
            Uses a blurred copy of the event image so its color naturally
            matches without any canvas / CORS pixel-read required. */}
        {/* overflow-hidden removed — letting blur fade naturally avoids the hard clipping line at the bottom edge */}
        <div className="hidden md:block absolute top-3 bottom-3 left-0 right-0 rounded-2xl translate-x-2 translate-y-2">
          {event.imageUrl ? (
            <img
              src={event.imageUrl}
              alt=""
              aria-hidden="true"
              className="w-full h-full object-cover scale-150 blur-3xl saturate-200 brightness-90 opacity-90"
            />
          ) : (
            <div className="w-full h-full bg-gray-300" />
          )}
        </div>

        {/* Main card — the full-width colored base.
            overflow-visible is required so the image div can extend above/below the card on desktop.
            The blur layers are wrapped in their own inset clipping div so they stay within the card shape. */}
        <div className="relative rounded-2xl border border-white/40 flex flex-col md:min-h-72 shadow-2xl">
          {/* Blur layers — clipped to the card shape by their own overflow-hidden wrapper.
              Kept separate from the main card so overflow-visible works for the image pop. */}
          <div className="absolute inset-0 rounded-2xl overflow-hidden z-0">
            {event.imageUrl && (
              <img
                src={event.imageUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover scale-150 blur-3xl saturate-150 opacity-50"
              />
            )}
            {/* White overlay — softens the blur so text remains legible */}
            <div className="absolute inset-0 bg-white/55" />
          </div>

          {/* Image — pops out of the card on desktop (extends 12px above/below via -top-3/-bottom-3).
              Starts flush with the card's left edge (left-0) so no gap is visible.
              overflow-hidden clips the image to its own rounded container, not the parent card. */}
          <div
            className="relative z-10 w-full h-72 overflow-hidden rounded-t-2xl
                        md:absolute md:-left-px md:-top-3 md:-bottom-3 md:w-[calc(50%+1px)] md:h-auto md:rounded-2xl"
          >
            {event.imageUrl ? (
              <img
                src={event.imageUrl}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-gray-400"
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

            {/* Trending badge */}
            <div className="absolute top-5 left-5">
              <span className="text-xs font-semibold bg-[#FF2727] text-white px-5 py-2 rounded-full shadow-sm">
                Trending
              </span>
            </div>
          </div>

          {/* Content — sits above the blur layers (z-10), pushed right on desktop */}
          <div className="relative z-10 flex-1 p-5 sm:p-6 md:pl-[54%] flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-[15px] text-[#FF7927] font-bold">
                {event.date}, {event.time}
              </p>
              <h3 className="font-bold text-xl text-gray-900 leading-snug">
                {event.title}
              </h3>
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <svg
                  className="w-3.5 h-3.5 text-[#FF7927] shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
                {event.location}
              </p>
            </div>
            {event.description && (
              <p className="text-sm text-gray-700 line-clamp-2">
                {event.description}
              </p>
            )}
            {event.tags?.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {event.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-white/60 border border-white/70 px-4 py-1 rounded-full text-gray-700 backdrop-blur-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-auto">
              <Link
                href={`/events/${event.id}`}
                className="inline-block bg-[#FF7927] hover:bg-[#E66B1F] text-white font-semibold px-8 py-3 rounded-full
                  transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_4px_20px_rgba(255,121,39,0.4)] active:scale-[0.98]"
              >
                View Event
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
