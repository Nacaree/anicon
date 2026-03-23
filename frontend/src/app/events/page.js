"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import PromotedEvents from "@/components/events/PromotedEvents";
import EventTimeline from "@/components/events/EventTimeline";
import EventsCategorySection from "@/components/events/EventsCategorySection";
import TrendingEvent from "@/components/events/TrendingEvent";
import { useSidebar } from "@/context/SidebarContext";
import { eventApi, normalizeEvent } from "@/lib/api";

export default function EventsPage() {
  const { isSidebarCollapsed } = useSidebar();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  // Multi-select: array of active tag names (D)
  const [selectedTags, setSelectedTags] = useState([]);

  useEffect(() => {
    eventApi
      .listEvents()
      .then((data) => setEvents(data.map(normalizeEvent)))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  // Tags with per-tag event counts (C)
  const allTags = [...new Set(events.flatMap((e) => e.tags || []))].map(
    (tag) => ({
      name: tag,
      count: events.filter((e) => e.tags?.includes(tag)).length,
    }),
  );

  // Toggle a tag in/out of the active set (D)
  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  // Tag bar background — transparent while the bar is in normal flow,
  // solid once it snaps into sticky position. Detected via an IntersectionObserver
  // on a zero-height sentinel placed immediately before the bar: when the sentinel
  // leaves the viewport the bar is stuck, so we show the background.
  const [isTagBarStuck, setIsTagBarStuck] = useState(false);
  const tagBarSentinelRef = useRef(null);
  useEffect(() => {
    const sentinel = tagBarSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsTagBarStuck(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Trending = event with the highest attendance; falls back to null while loading
  const trendingEvent =
    events.length > 0
      ? [...events].sort(
          (a, b) => (b.wantToGoCount || 0) - (a.wantToGoCount || 0),
        )[0]
      : null;

  // Events matching ANY of the selected tags (D — union, not intersection)
  const tagFilteredEvents =
    selectedTags.length > 0
      ? events.filter((e) => selectedTags.some((tag) => e.tags?.includes(tag)))
      : [];

  const cosplayEvents = events.filter(
    (e) =>
      e.category === "meetup" ||
      e.tags?.some((t) => t.toLowerCase().includes("cosplay")),
  );

  const conventionEvents = events.filter((e) => e.category === "convention");

  // Results section title: "#tag1 · #tag2" for multi-select (C)
  const resultsTitle = selectedTags.map((t) => `#${t}`).join(" · ");

  const sidebarOffset = isSidebarCollapsed ? "md:ml-20" : "md:ml-64";

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-clip">
      <Sidebar />
      <Header />

      <div className={`${sidebarOffset} pt-16 transition-all duration-300`}>
        {/* Promoted Events — only events flagged as is_promoted in the database */}
        <div className="px-4 sm:px-6 md:px-8 py-6 max-w-7xl mx-auto">
          <PromotedEvents events={events.filter(e => e.isPromoted).slice(0, 2)} loading={loading} />
        </div>

        {/* Event Timeline — relative z-10 creates a stacking context above the
            TrendingEvent depth shadow so the glow bleeds under it, not over it */}
        <div className="relative z-10">
          <EventTimeline events={events} loading={loading} />
        </div>

        {/* Trending Event */}
        <div className="px-4 sm:px-6 md:px-8 pt-6 max-w-7xl mx-auto">
          <TrendingEvent event={trendingEvent} loading={loading} />
        </div>

        {/* Sentinel — zero-height element whose disappearance signals the tag bar is now stuck */}
        <div ref={tagBarSentinelRef} />

        {/* Sticky tag bar (F) — sticks just below the fixed header (top-16 = 64px).
            Background is transparent while the bar is in flow; fills in once stuck. */}
        {allTags.length > 0 && (
          <div
            className={`sticky top-16 z-20 mt-6 transition-colors duration-300${isTagBarStuck ? " backdrop-blur-sm" : ""}`}
            style={{
              backgroundColor: isTagBarStuck
                ? "rgba(249, 250, 251, 0.95)"
                : "transparent",
            }}
          >
            <div className="px-4 sm:px-6 md:px-8 py-3 max-w-7xl mx-auto flex items-center gap-2 flex-wrap">
              {allTags.map((tag) => {
                const isActive = selectedTags.includes(tag.name);
                return (
                  <button
                    key={tag.name}
                    onClick={() => toggleTag(tag.name)}
                    className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border transition-all duration-200 ${
                      isActive
                        ? "bg-[#FF7927]/80 text-white border-[#FF7927]/30 backdrop-blur-md shadow-[0_0_12px_rgba(255,121,39,0.45)]"
                        : "bg-white/60 text-gray-600 border-white/70 backdrop-blur-sm hover:border-[#FF7927]/90 hover:text-[#FF7927] hover:bg-white/50 hover:shadow-[0_0_10"
                    }`}
                  >
                    #{tag.name}
                    {/* Event count (C) */}
                    <span
                      className={`text-xs font-medium ${
                        isActive ? "text-orange-100" : "text-gray-400"
                      }`}
                    >
                      {tag.count}
                    </span>
                    {/* ✕ indicator when active — clicking the button already deselects (C) */}
                    {isActive && (
                      <span className="text-orange-100 text-xs leading-none">
                        ✕
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Clear all — only shown when 2+ tags are active (D) */}
              {selectedTags.length > 1 && (
                <button
                  onClick={() => setSelectedTags([])}
                  className="text-sm text-gray-600 hover:text-black transition-colors ml-1"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        )}

        <div className="px-4 sm:px-6 md:px-8 py-6 space-y-10 max-w-7xl mx-auto">
          {/* Inline results row (B) — appears above category sections when tags are active.
              Shows events matching ANY selected tag, keeping sections fully intact below. */}
          {selectedTags.length > 0 && (
            // animate=false: section appears on demand (tag selection), no reveal animation.
            // Avoids the 400ms transition competing with the carousel scroll animation.
            <EventsCategorySection
              title={resultsTitle}
              events={tagFilteredEvents}
              loading={loading}
              animate={false}
            />
          )}

          {/* Cosplay Events — always visible, unaffected by tag selection */}
          <EventsCategorySection
            title="Cosplay events"
            events={cosplayEvents}
            loading={loading}
          />

          {/* Convention Events — always visible, unaffected by tag selection */}
          <EventsCategorySection
            title="Convention events"
            events={conventionEvents}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
