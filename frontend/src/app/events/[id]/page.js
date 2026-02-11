"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import EventImageCarousel from "@/components/events/EventImageCarousel";
import EventDetailInfo from "@/components/events/EventDetailInfo";
import EventOrganizer from "@/components/events/EventOrganizer";
import EventsCategorySection from "@/components/events/EventsCategorySection";
import { useSidebar } from "@/context/SidebarContext";
import { getEventById, getRelatedEvents } from "@/data/mockEvents";

export default function EventDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { isSidebarCollapsed } = useSidebar();

  const event = getEventById(id);
  const relatedEvents = getRelatedEvents(id, 4);

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <Header />
        <div
          className={`${
            isSidebarCollapsed ? "md:ml-20" : "md:ml-64"
          } pt-16 transition-all duration-300`}
        >
          <div className="px-4 sm:px-6 md:px-8 py-12 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Event not found
            </h1>
            <p className="text-gray-500 mb-4">
              The event you&apos;re looking for doesn&apos;t exist.
            </p>
            <button
              onClick={() => router.push("/events")}
              className="text-[#FF7927] hover:text-[#E66B1F] font-medium transition-colors"
            >
              Back to Events
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />

      <div
        className={`${
          isSidebarCollapsed ? "md:ml-20" : "md:ml-64"
        } pt-16 transition-all duration-300`}
      >
        <div className="px-4 sm:px-6 md:px-8 py-6 max-w-3xl">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors bg-white border border-gray-200 rounded-lg px-3 py-1.5"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>

          {/* Image Carousel */}
          <div className="mb-5">
            <EventImageCarousel
              images={event.images}
              thumbnails={event.thumbnails}
            />
          </div>

          {/* Event Info */}
          <div className="mb-10">
            <EventDetailInfo event={event} />
          </div>

          {/* Event Organizer */}
          <div className="mb-10">
            <EventOrganizer organizer={event.organizer} />
          </div>

          {/* You May Also Like */}
          <div className="mb-10">
            <EventsCategorySection
              title="You May Also Like"
              events={relatedEvents}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
