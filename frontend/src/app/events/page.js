"use client";

import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import PromotedEvents from "@/components/events/PromotedEvents";
import EventTimeline from "@/components/events/EventTimeline";
import EventsCategorySection from "@/components/events/EventsCategorySection";
import TrendingEvent from "@/components/events/TrendingEvent";
import { useSidebar } from "@/context/SidebarContext";
import { cosplayEvents, culturalEvents } from "@/data/mockEvents";

export default function EventsPage() {
  const { isSidebarCollapsed } = useSidebar();

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
          />

          {/* Cultural Events */}
          <EventsCategorySection
            title="Cultural events"
            events={culturalEvents}
          />
        </div>
      </div>
    </div>
  );
}
