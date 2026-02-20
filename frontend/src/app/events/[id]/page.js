"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { useSidebar } from "@/context/SidebarContext";
import { getEventById, getRelatedEvents } from "@/data/mockEvents";

const EventImageCarousel = dynamic(
  () => import("@/components/events/EventImageCarousel"),
  {
    ssr: false,
    loading: () => (
      <div>
        <Skeleton className="rounded-xl aspect-[16/9] mb-3" />
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="w-20 h-14 sm:w-24 sm:h-16 rounded-lg flex-shrink-0" />
          ))}
        </div>
      </div>
    ),
  }
);

const EventDetailInfo = dynamic(
  () => import("@/components/events/EventDetailInfo"),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse">
        <div className="mb-3">
          <div className="h-4 w-28 bg-gray-200 rounded mb-2" />
          <div className="h-7 w-64 bg-gray-200 rounded" />
        </div>
        <div className="h-4 w-44 bg-gray-200 rounded mb-3" />
        <div className="flex gap-1.5 mb-4">
          <div className="h-6 w-16 bg-gray-200 rounded-full" />
          <div className="h-6 w-20 bg-gray-200 rounded-full" />
          <div className="h-6 w-18 bg-gray-200 rounded-full" />
        </div>
        <div className="space-y-2 mb-6">
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-3/4 bg-gray-200 rounded" />
        </div>
        <div className="h-5 w-20 bg-gray-200 rounded mb-3" />
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3 max-w-md">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded" style={{ width: `${65 + i * 5}%` }} />
          ))}
        </div>
      </div>
    ),
  }
);

const EventOrganizer = dynamic(
  () => import("@/components/events/EventOrganizer"),
  {
    ssr: false,
    loading: () => (
      <div>
        <div className="h-5 w-36 bg-gray-200 rounded animate-pulse mb-3" />
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-200" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-5 w-28 bg-gray-200 rounded" />
                <div className="h-5 w-16 bg-gray-200 rounded-full" />
              </div>
              <div className="h-4 w-24 bg-gray-200 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4 px-1">
            <div className="flex-1 flex flex-col items-center gap-1">
              <div className="h-5 w-10 bg-gray-200 rounded" />
              <div className="h-3 w-16 bg-gray-200 rounded" />
            </div>
            <div className="w-px h-7 bg-gray-200" />
            <div className="flex-1 flex flex-col items-center gap-1">
              <div className="h-5 w-10 bg-gray-200 rounded" />
              <div className="h-3 w-16 bg-gray-200 rounded" />
            </div>
          </div>
          <div className="border-t border-gray-100 pt-3 mt-4 flex justify-center">
            <div className="h-4 w-24 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    ),
  }
);

const EventTicketCard = dynamic(
  () => import("@/components/events/EventTicketCard"),
  {
    ssr: false,
    loading: () => (
      <div>
        <div className="h-5 w-40 bg-gray-200 rounded animate-pulse mb-3" />
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm animate-pulse">
          <div className="h-7 w-24 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
          <div className="flex items-center gap-3">
            <div className="flex-1 h-12 bg-gray-200 rounded-full" />
            <div className="w-12 h-12 bg-gray-200 rounded-full" />
          </div>
        </div>
      </div>
    ),
  }
);

const EventsCategorySection = dynamic(
  () => import("@/components/events/EventsCategorySection"),
  {
    ssr: false,
    loading: () => (
      <section>
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="flex gap-4 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-56 shrink-0 animate-pulse">
              <div className="h-36 bg-gray-200 rounded-xl mb-2" />
              <div className="h-4 w-3/4 bg-gray-200 rounded mb-1" />
              <div className="h-3 w-1/2 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </section>
    ),
  }
);

export default function EventDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { isSidebarCollapsed } = useSidebar();

  const event = getEventById(id);
  const relatedEvents = getRelatedEvents(id, 10);

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
          <div className="px-4 sm:px-6 md:px-8 py-12 text-center max-w-3xl mx-auto">
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
        <div className="px-4 sm:px-6 md:px-8 py-6 max-w-7xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => {
              if (
                typeof window !== "undefined" &&
                window.history.length > 1 &&
                document.referrer.includes(window.location.origin)
              ) {
                router.back();
              } else {
                router.push("/events");
              }
            }}
            className="flex items-center gap-1.4 text-sm font-medium text-gray-600 mb-4
              bg-white border border-gray-200 rounded-full px-4 py-1.5
              transition-all duration-300
              hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 hover:scale-[1.03]
              active:scale-[0.97]"
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

          {/* Main Content + Sidebar */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Column */}
            <div className="flex-1 min-w-0">
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
            </div>

            {/* Right Sidebar */}
            <div className="w-full lg:w-[340px] lg:flex-shrink-0">
              <div className="lg:sticky lg:top-20 space-y-5">
                <EventOrganizer organizer={event.organizer} />
                <EventTicketCard event={event} />
              </div>
            </div>
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
