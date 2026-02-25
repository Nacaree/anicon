"use client";

import { useState, useEffect } from "react";
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
  const [selectedTag, setSelectedTag] = useState(null);

  useEffect(() => {
    eventApi
      .listEvents()
      .then((data) => setEvents(data.map(normalizeEvent)))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  const allTags = [...new Set(events.flatMap((e) => e.tags || []))];

  const cosplayEvents = events.filter(
    (e) =>
      e.category === "meetup" ||
      e.tags?.some((t) => t.toLowerCase().includes("cosplay"))
  );

  const conventionEvents = events.filter(
    (e) => e.category === "convention"
  );

  const tagFilteredEvents = selectedTag
    ? events.filter((e) => e.tags?.includes(selectedTag))
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />

      {/* Content */}
      <div
        className={`${
          isSidebarCollapsed ? "md:ml-20" : "md:ml-64"
        } pt-16 transition-all duration-300`}
      >
        <div className="px-4 sm:px-6 md:px-8 py-6 max-w-7xl mx-auto">
          <PromotedEvents />
        </div>

        {/* Event Timeline — full bleed so gradient extends edge to edge */}
        <EventTimeline events={events} loading={loading} />

        <div className="px-4 sm:px-6 md:px-8 py-6 space-y-10 max-w-7xl mx-auto">
          {/* Trending Event */}
          <TrendingEvent />

          {/* Tag Filter */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                    selectedTag === tag
                      ? "bg-[#FF7927] text-white border-[#FF7927]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-[#FF7927] hover:text-[#FF7927]"
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {/* Tag-filtered results OR category sections */}
          {selectedTag ? (
            <EventsCategorySection
              title={`#${selectedTag}`}
              events={tagFilteredEvents}
              loading={loading}
            />
          ) : (
            <>
              {/* Cosplay Events */}
              <EventsCategorySection
                title="Cosplay events"
                events={cosplayEvents}
                loading={loading}
              />

              {/* Convention Events */}
              <EventsCategorySection
                title="Convention events"
                events={conventionEvents}
                loading={loading}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
