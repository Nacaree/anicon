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

  useEffect(() => {
    eventApi
      .listEvents()
      .then((data) => setEvents(data.map(normalizeEvent)))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  const cosplayEvents = events.filter((e) =>
    e.tags?.some((t) => t.toLowerCase().includes("cosplay"))
  );

  const culturalEvents = events.filter(
    (e) =>
      e.category === "workshop" ||
      e.category === "meetup" ||
      e.tags?.some((t) => t.toLowerCase().includes("cultural"))
  );

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
        <div className="px-4 sm:px-6 md:px-8 py-6 space-y-10 max-w-7xl mx-auto">
          {/* Promoted Events */}
          <PromotedEvents />

          {/* Event Timeline */}
          <EventTimeline />

          {/* Trending Event */}
          <TrendingEvent />

          {/* Cosplay Events */}
          <EventsCategorySection
            title="Cosplay events"
            events={cosplayEvents}
            loading={loading}
          />

          {/* Cultural Events */}
          <EventsCategorySection
            title="Cultural events"
            events={culturalEvents}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
