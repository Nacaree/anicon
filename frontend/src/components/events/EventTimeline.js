"use client";

import { useState, useMemo, useRef } from "react";
import EventsPageCard from "./EventsPageCard";

const MONTH_KEYS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

const MONTH_COLORS = {
  jan: {
    bg: "bg-gradient-to-b from-sky-100 to-transparent",
    pill: "bg-sky-400 text-white",
    line: "bg-sky-400",
  },
  feb: {
    bg: "bg-gradient-to-b from-pink-100 to-transparent",
    pill: "bg-pink-400 text-white",
    line: "bg-pink-400",
  },
  mar: {
    bg: "bg-gradient-to-b from-green-100 to-transparent",
    pill: "bg-green-500 text-white",
    line: "bg-green-500",
  },
  apr: {
    bg: "bg-gradient-to-b from-violet-100 to-transparent",
    pill: "bg-violet-400 text-white",
    line: "bg-violet-400",
  },
  may: {
    bg: "bg-gradient-to-b from-amber-100 to-transparent",
    pill: "bg-amber-400 text-white",
    line: "bg-amber-400",
  },
  jun: {
    bg: "bg-gradient-to-b from-orange-100 to-transparent",
    pill: "bg-orange-400 text-white",
    line: "bg-orange-400",
  },
  jul: {
    bg: "bg-gradient-to-b from-red-100 to-transparent",
    pill: "bg-red-400 text-white",
    line: "bg-red-400",
  },
  aug: {
    bg: "bg-gradient-to-b from-teal-100 to-transparent",
    pill: "bg-teal-500 text-white",
    line: "bg-teal-500",
  },
  sep: {
    bg: "bg-gradient-to-b from-indigo-100 to-transparent",
    pill: "bg-indigo-400 text-white",
    line: "bg-indigo-400",
  },
  oct: {
    bg: "bg-gradient-to-b from-rose-100 to-transparent",
    pill: "bg-rose-400 text-white",
    line: "bg-rose-400",
  },
  nov: {
    bg: "bg-gradient-to-b from-purple-100 to-transparent",
    pill: "bg-purple-400 text-white",
    line: "bg-purple-400",
  },
  dec: {
    bg: "bg-gradient-to-b from-yellow-100 to-transparent",
    pill: "bg-yellow-500 text-white",
    line: "bg-yellow-500",
  },
};

function getMonthKey(eventDate) {
  if (!eventDate) return null;
  const index = parseInt(String(eventDate).split("-")[1], 10) - 1;
  return MONTH_KEYS[index] ?? null;
}

export default function EventTimeline({ events = [], loading = false }) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [showButtons, setShowButtons] = useState(false);
  const scrollRef = useRef(null);

  const categories = useMemo(() => {
    const cats = [...new Set(events.map((e) => e.category).filter(Boolean))];
    return ["All", ...cats.map((c) => c.charAt(0).toUpperCase() + c.slice(1))];
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (activeCategory === "All") return events;
    return events.filter(
      (e) => e.category?.toLowerCase() === activeCategory.toLowerCase(),
    );
  }, [events, activeCategory]);

  const monthGroups = useMemo(() => {
    const groups = {};
    const order = [];
    for (const event of filteredEvents) {
      const key = getMonthKey(event.eventDate ?? event.date);
      if (!key) continue;
      if (!groups[key]) {
        groups[key] = [];
        order.push(key);
      }
      groups[key].push(event);
    }
    return order.map((key) => ({ key, events: groups[key] }));
  }, [filteredEvents]);

  const firstMonthBg =
    monthGroups.length > 0
      ? (MONTH_COLORS[monthGroups[0].key]?.bg ?? "bg-gray-50")
      : "bg-gray-50";
  const firstMonthLine =
    monthGroups.length > 0
      ? (MONTH_COLORS[monthGroups[0].key]?.line ?? "bg-gray-300")
      : "bg-gray-300";

  const lastMonthBg =
    monthGroups.length > 0
      ? (MONTH_COLORS[monthGroups[monthGroups.length - 1].key]?.bg ??
        "bg-gray-50")
      : "bg-gray-50";
  const lastMonthLine =
    monthGroups.length > 0
      ? (MONTH_COLORS[monthGroups[monthGroups.length - 1].key]?.line ??
        "bg-gray-300")
      : "bg-gray-300";

  const scroll = (dir) => {
    scrollRef.current?.scrollBy({
      left: dir === "left" ? -400 : 400,
      behavior: "smooth",
    });
  };

  if (loading) {
    return (
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mb-4">
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          <div className="flex" style={{ minWidth: "100%" }}>
            <div className="flex-1 bg-sky-50" />
            {["bg-sky-50", "bg-pink-50", "bg-green-50"].map((bg, i) => (
              <div key={i} className={`${bg} shrink-0`}>
                <div className="relative h-9 px-4 sm:px-6 md:px-8">
                  <div className="h-px bg-gray-300 absolute inset-x-0 top-1/2 -translate-y-1/2" />
                  <div className="relative h-full flex items-center">
                    <div className="h-6 w-12 bg-gray-200 rounded-full animate-pulse" />
                  </div>
                </div>
                <div className="flex gap-4 pt-3 pb-4 px-4 sm:px-6 md:px-8">
                  {[...Array(2)].map((_, j) => (
                    <div key={j} className="w-56 animate-pulse">
                      <div className="h-36 bg-gray-200 rounded-xl mb-2" />
                      <div className="h-4 w-3/4 bg-gray-200 rounded mb-1" />
                      <div className="h-3 w-1/2 bg-gray-100 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex-1 bg-green-50" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mb-4">
        <div className="flex items-center gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 shrink-0">
            <span className="text-xl">🎪</span>
            EVENT TIMELINE
          </h2>
          <div className="flex items-center gap-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-sm px-3 py-1 rounded-full transition-colors ${
                  activeCategory === cat
                    ? "text-[#FF7927] font-semibold"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll row */}
      {monthGroups.length > 0 ? (
        <div
          className="relative"
          onMouseEnter={() => setShowButtons(true)}
          onMouseLeave={() => setShowButtons(false)}
        >
          {/* Outer div handles scroll; inner div is min full-width so filler works */}
          <div
            ref={scrollRef}
            className="overflow-x-auto"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <div className="flex" style={{ minWidth: "100%" }}>
              {/* Filler: extends the first month's line and gradient to the left edge */}
              {/* Gradient is absolutely positioned starting at top-4.5 = center of h-9 line row */}
              <div className="flex-1 relative">
                <div className="relative h-9">
                  <div
                    className={`absolute inset-x-0 top-1/2 -translate-y-1/2 h-px ${firstMonthLine}`}
                  />
                </div>
                <div className={`absolute inset-x-0 bottom-0 top-[18.5px] ${firstMonthBg}`} />
              </div>
              {monthGroups.map(({ key, events: monthEvents }) => {
                const colors = MONTH_COLORS[key] ?? {
                  bg: "bg-gray-50",
                  pill: "bg-gray-400 text-white",
                  line: "bg-gray-400",
                };
                return (
                  <div key={key} className="shrink-0 relative">
                    {/* Gradient overlay starting at the line's center (top-4.5 = h-9 / 2) */}
                    <div className={`absolute inset-x-0 bottom-0 top-[18.5px] ${colors.bg}`} />

                    {/* Pill sitting on the line — rendered above the gradient via relative */}
                    <div className="relative h-9 px-4 sm:px-6 md:px-17">
                      <div
                        className={`absolute inset-x-0 top-1/2 -translate-y-1/2 h-px ${colors.line}`}
                      />
                      <div className="relative h-full flex items-center">
                        <span
                          className={`${colors.pill} text-xs font-bold px-3 py-1 rounded-full`}
                        >
                          {key.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Cards sit on top of the gradient */}
                    <div className="relative flex gap-4 pt-3 pb-4 px-4 sm:px-6 md:px-17">
                      {monthEvents.map((event) => (
                        <div
                          key={event.id}
                          className="hover:scale-[1.05] hover:z-10 transition-transform duration-300 ease-out"
                          style={{ transformOrigin: "center bottom" }}
                        >
                          <EventsPageCard event={event} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Filler: extends the last month's line and gradient to the right edge */}
              <div className="flex-1 relative">
                <div className="relative h-9">
                  <div
                    className={`absolute inset-x-0 top-1/2 -translate-y-1/2 h-px ${lastMonthLine}`}
                  />
                </div>
                <div className={`absolute inset-x-0 bottom-0 top-[18.5px] ${lastMonthBg}`} />
              </div>
            </div>
          </div>

          <button
            onClick={() => scroll("left")}
            className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center transition-opacity duration-300 hover:bg-gray-50 ${
              showButtons ? "opacity-100" : "opacity-0"
            }`}
            aria-label="Scroll left"
          >
            <svg
              className="w-5 h-5 text-orange-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <button
            onClick={() => scroll("right")}
            className={`absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center transition-opacity duration-300 hover:bg-gray-50 ${
              showButtons ? "opacity-100" : "opacity-0"
            }`}
            aria-label="Scroll right"
          >
            <svg
              className="w-5 h-5 text-orange-600"
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
      ) : (
        <div className="text-center py-8 text-gray-400 text-sm">
          No events found
        </div>
      )}
    </section>
  );
}
