"use client";

/**
 * loading.js — Next.js App Router route-level loading UI for /events/[id].
 *
 * Next.js wraps every page segment in a Suspense boundary. When this file
 * exists, it is shown IMMEDIATELY when the user clicks a link to this route —
 * before the page's JS bundle has been downloaded or any data has been fetched.
 *
 * Without this file, Next.js holds the previous page visible and frozen while
 * the bundle downloads from the CDN (300ms–1.5s in production). With this file,
 * the URL changes instantly and the user sees a skeleton, making navigation
 * feel instant.
 *
 * This skeleton mirrors the layout in page.js's `if (loading)` block so the
 * transition from this file to the page's own loading state is seamless.
 */

import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { useSidebar } from "@/context/SidebarContext";

export default function EventDetailLoading() {
  const { isSidebarCollapsed } = useSidebar();

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
          {/* Back button placeholder */}
          <div className="h-8 w-24 bg-gray-200 rounded-full animate-pulse mb-6" />

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left column */}
            <div className="flex-1 min-w-0">
              <div className="mb-5">
                {/* Image carousel skeleton */}
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

              {/* Event info skeleton */}
              <div className="animate-pulse mb-10">
                <div className="h-4 w-28 bg-gray-200 rounded mb-2" />
                <div className="h-7 w-64 bg-gray-200 rounded mb-3" />
                <div className="h-4 w-44 bg-gray-200 rounded mb-4" />
                <div className="h-4 w-full bg-gray-200 rounded mb-2" />
                <div className="h-4 w-3/4 bg-gray-200 rounded" />
              </div>
            </div>

            {/* Right sidebar */}
            <div className="w-full lg:w-[340px] lg:flex-shrink-0 space-y-5">
              {/* Organizer card skeleton */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm animate-pulse">
                <div className="w-12 h-12 rounded-full bg-gray-200 mb-3" />
                <div className="h-5 w-32 bg-gray-200 rounded mb-2" />
                <div className="h-4 w-24 bg-gray-200 rounded" />
              </div>

              {/* Ticket card skeleton */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm animate-pulse">
                <div className="h-7 w-24 bg-gray-200 rounded mb-2" />
                <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
                <div className="h-12 bg-gray-200 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
