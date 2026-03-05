"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { useSidebar } from "@/context/SidebarContext";
import { eventApi, profileApi, normalizeEvent, getCachedEvent } from "@/lib/api";
// Inlined — no heavy deps, no extra chunk round-trip needed
import EventImageCarousel from "@/components/events/EventImageCarousel";
import EventDetailInfo from "@/components/events/EventDetailInfo";
import EventOrganizer from "@/components/events/EventOrganizer";

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
  },
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
  },
);

export default function EventDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { isSidebarCollapsed } = useSidebar();

  // Synchronously initialize from the in-memory event cache on first render.
  // When the user clicks a card from /events, listEvents() already ran and
  // populated _eventCache — getCachedEvent() returns the raw event immediately,
  // so loading starts as false and the skeleton never flashes.
  // Direct links (/events/[id] typed or refreshed) still get loading=true and fetch normally.
  const [event, setEvent] = useState(() => {
    const cached = getCachedEvent(id);
    return cached ? normalizeEvent(cached) : null;
  });
  const [organizer, setOrganizer] = useState(null);
  const [relatedEvents, setRelatedEvents] = useState([]);
  const [loading, setLoading] = useState(() => getCachedEvent(id) === null);
  const [notFound, setNotFound] = useState(false);

  // Scroll to top on every navigation to this page.
  // Next.js App Router caches scroll positions per URL in production and restores
  // them on revisit — causing the page to load mid-scroll. Imperatively resetting
  // here wins over that cache and always gives the user a fresh view from the top.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [id]);

  useEffect(() => {
    async function load() {
      try {
        // Phase 1: fetch only the main event.
        // setLoading(false) immediately after so the page renders without waiting
        // for the related events list (which fetches ALL events and is slower in prod).
        const eventData = await eventApi.getEvent(id);
        setEvent(normalizeEvent(eventData));
        setLoading(false);

        // Phase 2: fetch organizer + related events after the page is already visible.
        // These are non-critical — failures are silently ignored.
        const organizerPromise = eventData.organizerId
          ? profileApi
              .getProfileById(eventData.organizerId)
              .then((profile) =>
                setOrganizer({
                  avatarUrl: profile.avatarUrl,
                  displayName: profile.displayName,
                  username: profile.username,
                  role: profile.roles?.[0] || "organizer",
                  followers: profile.followerCount || 0,
                  following: profile.followingCount || 0,
                }),
              )
              .catch(() => {}) // Organizer profile unavailable — section won't render
          : Promise.resolve();

        // listEvents() fetches all events — kept out of Phase 1 because it's the
        // slowest call and used only for "You May Also Like", not the main content.
        const relatedPromise = eventApi
          .listEvents()
          .then((allEvents) =>
            setRelatedEvents(
              allEvents
                .filter((e) => e.id !== id)
                .slice(0, 10)
                .map(normalizeEvent),
            ),
          )
          .catch(() => {}); // "You May Also Like" failing is non-critical

        await Promise.all([organizerPromise, relatedPromise]);
      } catch (err) {
        if (err.status === 404) setNotFound(true);
        setLoading(false);
      }
    }

    load();
  }, [id]);

  const layout = (children) => (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />
      <div
        className={`${
          isSidebarCollapsed ? "md:ml-20" : "md:ml-64"
        } pt-16 transition-all duration-300`}
      >
        {children}
      </div>
    </div>
  );

  if (loading) {
    return layout(
      <div className="px-4 sm:px-6 md:px-8 py-6 max-w-7xl mx-auto">
        <div className="h-8 w-24 bg-gray-200 rounded-full animate-pulse mb-6" />
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0">
            <div className="mb-5">
              <Skeleton className="rounded-xl aspect-[16/9] mb-3" />
              <div className="flex gap-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton
                    key={i}
                    className="w-20 h-14 sm:w-24 sm:h-16 rounded-lg flex-shrink-0"
                  />
                ))}
              </div>
            </div>
            <div className="animate-pulse mb-10">
              <div className="h-4 w-28 bg-gray-200 rounded mb-2" />
              <div className="h-7 w-64 bg-gray-200 rounded mb-3" />
              <div className="h-4 w-44 bg-gray-200 rounded mb-4" />
              <div className="h-4 w-full bg-gray-200 rounded mb-2" />
              <div className="h-4 w-3/4 bg-gray-200 rounded" />
            </div>
          </div>
          <div className="w-full lg:w-[340px] lg:flex-shrink-0 space-y-5">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm animate-pulse">
              <div className="w-12 h-12 rounded-full bg-gray-200 mb-3" />
              <div className="h-5 w-32 bg-gray-200 rounded mb-2" />
              <div className="h-4 w-24 bg-gray-200 rounded" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm animate-pulse">
              <div className="h-7 w-24 bg-gray-200 rounded mb-2" />
              <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
              <div className="h-12 bg-gray-200 rounded-full" />
            </div>
          </div>
        </div>
      </div>,
    );
  }

  if (notFound || !event) {
    return layout(
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
      </div>,
    );
  }

  return layout(
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
            router.push("/");
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
            {organizer && <EventOrganizer organizer={organizer} />}
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
    </div>,
  );
}
