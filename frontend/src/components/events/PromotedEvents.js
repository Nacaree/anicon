"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

function PromotedEventCard({ event }) {
  // Scroll reveal — card slides up when it enters the viewport.
  const cardRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -20px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    // Outer wrapper — flex-1 so both cards split available width equally.
    // py-2 gives the glow room to bleed above/below the card edges.
    // group/card drives the glow intensity on hover (named group so it doesn't
    // conflict with the inner `group` used for the image zoom).
    <div
      ref={cardRef}
      className={`relative flex-1 min-w-0 py-3 mb-[-15] group/card transition-all duration-500 ease-in-out ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
    >
      {/* Aura bleed — no overflow-hidden so the blurred image bleeds freely past the card edges, mirroring TrendingEvent. */}
      {event.imageUrl && (
        <div className="absolute top-0 bottom-0 left-0 right-0 rounded-3xl promoted-aura">
          <img
            src={event.imageUrl}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="w-full h-full object-cover scale-125 pointer-events-none promoted-hue-drift"
          />
        </div>
      )}

      <Link
        href={`/events/${event.id}`}
        className="relative rounded-3xl overflow-hidden h-56 sm:h-64 md:h-90 group cursor-pointer block transition-transform duration-150 active:scale-[0.98] active:brightness-90"
      >
        {/* Background */}
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gray-300" />
        )}

        {/* Subtle top-to-mid scrim so the badge stays readable */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />

        {/* Shimmer sweep — diagonal sheen that repeats every 5s, sits below badges (z-[5]) */}
        <div className="promoted-shimmer absolute inset-0 w-1/2 bg-linear-to-r from-transparent via-white/20 to-transparent pointer-events-none z-5" />

        {/* Promoted Badge */}
        <div className="absolute top-4 left-4 z-10">
          <span
            className="inline-block bg-gradient-to-r from-[#FF7927] to-[#FFAB3D] text-white text-xs font-semibold px-5 py-2 rounded-full
            shadow-[0_2px_12px_rgba(255,121,39,0.6)] transition-all duration-300
            group-hover:scale-110 group-hover:shadow-[0_4px_20px_rgba(255,121,39,0.85)]"
          >
            Promoted Event
          </span>
        </div>

        {/* Date badge — ticket stub style */}
        {event.date &&
          (() => {
            const [month, day] = event.date.split(" ");
            return (
              <div
                className="absolute top-4 right-4 z-10 flex flex-col items-center bg-white/15 backdrop-blur-md border border-white/25 rounded-xl px-3 py-1.5 shadow-md min-w-11
                transition-all duration-300 group-hover:scale-110 group-hover:bg-white/25 group-hover:border-white/45"
              >
                <span className="text-white text-lg font-bold leading-none">
                  {day}
                </span>
                <span className="text-white/80 text-[10px] font-semibold uppercase tracking-widest">
                  {month}
                </span>
              </div>
            );
          })()}

        {/* Info bar — darkens on hover (option 2); arrow reveals on hover (option 4) */}
        <div
          className="absolute bottom-0 left-0 right-0 z-10
          bg-white/10 group-hover:bg-black/40 backdrop-blur-md
          p-4 sm:p-3.5 text-white
          transition-colors duration-300"
        >
          {/* Title row — arrow slides in from the right on hover */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-bold text-lg sm:text-xl line-clamp-1 drop-shadow-sm">
              {event.title}
            </h3>
            <span
              className="shrink-0 text-white text-xl leading-none opacity-0 translate-x-2 translate-y-6
                         group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
            >
              →
            </span>
          </div>

          {/* Location row */}
          <p className="text-xs text-white/80 mb-2 flex items-center gap-1.5">
            <span className="line-clamp-1">{event.location}</span>
          </p>

          {/* Tags */}
          {event.tags?.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {event.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-white/15 border border-white/25 px-2.5 py-0.5 rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}

function PromotedEventSkeleton() {
  return (
    <div className="flex-1 min-w-0 py-2">
      <div className="relative rounded-2xl overflow-hidden h-56 sm:h-64 md:h-72 bg-gray-200 animate-pulse">
        <div className="absolute top-4 left-4 w-28 h-6 bg-gray-300 rounded-full" />
        <div className="absolute bottom-5 left-5 right-5 space-y-2">
          <div className="h-5 bg-gray-300 rounded w-3/4" />
          <div className="flex gap-2">
            <div className="h-4 bg-gray-300 rounded-full w-14" />
            <div className="h-4 bg-gray-300 rounded-full w-14" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PromotedEvents({ events = [], loading = false }) {
  if (loading) {
    return (
      <div className="flex flex-col sm:flex-row gap-4">
        <PromotedEventSkeleton />
        <PromotedEventSkeleton />
      </div>
    );
  }

  if (events.length === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {events.map((event) => (
        <PromotedEventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
