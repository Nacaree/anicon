"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/context/AuthContext";
import { usePostModal } from "@/context/PostModalContext";
import { feedApi } from "@/lib/api";
import PostComposer from "@/components/posts/PostComposer";
import PostComposerModal from "@/components/posts/PostComposerModal";
import PostFeed from "@/components/posts/PostFeed";
import BottomNav from "@/components/BottomNav";

const FeaturedEvents = dynamic(
  () => import("@/components/events/FeaturedEvents"),
  {
    ssr: false,
    loading: () => (
      <div className="mb-8 animate-pulse">
        {/* Section Header */}
        <div className="flex items-baseline justify-between mb-4">
          <Skeleton className="h-6 w-40 rounded" />
          <Skeleton className="h-4 w-20 rounded" />
        </div>
        {/* Carousel Container */}
        <div className="relative rounded-xl overflow-hidden p-6 bg-gray-200 h-48 sm:h-56 md:h-72">
          <div className="flex gap-4 overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-xl h-40 sm:h-48 md:h-64 w-[280px] sm:w-100 md:w-125 lg:w-150 bg-gray-300/50 shrink-0" />
            ))}
          </div>
        </div>
      </div>
    ),
  }
);

const EventSections = dynamic(
  () => import("@/components/events/EventSections"),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-8 animate-pulse">
        {/* Two carousel sections */}
        {[...Array(2)].map((_, s) => (
          <section key={s}>
            <Skeleton className="h-6 w-44 rounded mb-4" />
            <div className="flex gap-4 overflow-hidden">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-xl h-50 w-64 sm:w-72 lg:w-80 bg-gray-200 shrink-0" />
              ))}
            </div>
          </section>
        ))}
      </div>
    ),
  }
);

const RightPanel = dynamic(
  () => import("@/components/RightPanel"),
  {
    ssr: false,
    loading: () => (
      <aside className="w-80 space-y-6 sticky top-20 self-start animate-pulse">
        {/* Creator Profile Card */}
        <div className="bg-white rounded-xl px-6 pt-0 pb-6 border border-gray-200">
          {/* Banner */}
          <Skeleton className="rounded-t-xl h-25 -mx-6 mb-3" />
          {/* Profile pic placeholder */}
          <div className="relative">
            <Skeleton className="w-24 h-24 rounded-full absolute -top-14 left-0 border-4 border-white" />
          </div>
          <div className="pt-10 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-28 rounded" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-4 w-40 rounded" />
            <div className="flex items-center gap-2 pt-1">
              <Skeleton className="w-4 h-4 rounded-full" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
            <Skeleton className="h-10 w-full rounded-full mt-2" />
          </div>
        </div>

        {/* Trending Now */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <Skeleton className="h-5 w-28 rounded mb-4" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="pb-3 border-b border-gray-100 last:border-0">
                <Skeleton className="h-4 w-32 rounded mb-1" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Users */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <Skeleton className="h-5 w-36 rounded mb-4" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-20 rounded mb-1" />
                  <Skeleton className="h-3 w-24 rounded" />
                </div>
                <Skeleton className="h-8 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </aside>
    ),
  }
);

export default function Home() {
  const { isSidebarCollapsed } = useSidebar();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { openPostDirect, openPost, registerCallbacks } = usePostModal();
  // Incremented by the "anicon-home-refresh" custom event dispatched from Header
  // when the user clicks the logo while already on the homepage.
  // Passing this as `key` to FeaturedEvents and EventSections forces React to
  // unmount + remount them, re-running their useEffect data fetches.
  const [refreshKey, setRefreshKey] = useState(0);
  // Separate key for the feed so new posts prepend without remounting the whole feed
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  // Composer modal state — opened when clicking the compact composer trigger
  const [composerOpen, setComposerOpen] = useState(false);
  // Files pre-selected from the composer's image button
  const [composerInitialFiles, setComposerInitialFiles] = useState(null);
  // Post being edited — when set, the composer opens in edit mode
  const [editingPost, setEditingPost] = useState(null);

  // Register feed-specific callbacks so the global PostDetailModal can refresh
  // this page's feed on delete/edit
  useEffect(() => {
    return registerCallbacks({
      onPostDeleted: () => setFeedRefreshKey((k) => k + 1),
      onEdit: (post) => {
        setEditingPost(post);
        setComposerOpen(true);
      },
    });
  }, [registerCallbacks]);

  useEffect(() => {
    const refreshHandler = () => {
      setRefreshKey((k) => k + 1);
      setFeedRefreshKey((k) => k + 1);
    };
    // Check URL for ?post={id} — used by shared post links (/posts/{id} redirects here)
    const params = new URLSearchParams(window.location.search);
    const postParam = params.get("post");
    if (postParam) {
      // Clear the query param from the URL without triggering a navigation
      window.history.replaceState({}, "", "/");
      openPost(postParam);
    }
    window.addEventListener("anicon-home-refresh", refreshHandler);
    return () => {
      window.removeEventListener("anicon-home-refresh", refreshHandler);
    };
  }, [openPost]);

  // Fetch function for the unified feed — transforms polymorphic FeedItemResponse
  // into the flat shape useInfiniteScroll expects ({ posts, nextCursor }).
  // Each item gets a __feedType tag so PostFeed can render the correct card.
  const fetchFeed = useCallback(async (cursor) => {
    const result = await feedApi.getFeed(cursor);
    const posts = (result?.items ?? []).map((item) => {
      if (item.type === "post") return { ...item.post, __feedType: "post" };
      return { ...item.scrapedEvent, __feedType: "scraped_event" };
    });
    return { posts, nextCursor: result?.nextCursor };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />

      {/* Content Wrapper - respects sidebar offset */}
      <div
        className={`${
          isSidebarCollapsed ? "md:ml-20" : "md:ml-64"
        } pt-16 pb-16 md:pb-0 transition-all duration-300`}
      >
        {/* Featured Events - Full Width Section */}
        <section className="w-full px-4 sm:px-6 md:px-8 pt-4 pb-8">
          <FeaturedEvents key={refreshKey} />
        </section>

        {/* Main Content + Right Panel Row */}
        <div className="flex flex-col xl:flex-row gap-6 px-4 sm:px-6 md:px-8 pb-8">
          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            <EventSections key={refreshKey} />

            {/* Social Feed — real posts from all users, capped width to match design.
                Gated on !authLoading so the first fetch always has the auth token,
                ensuring liked/reposted state is correct without a racy re-fetch. */}
            <div className="mt-8 max-w-3xl mx-auto">
              {authLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 mb-3 animate-pulse">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                        <div className="space-y-1.5">
                          <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" />
                          <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
                        </div>
                      </div>
                      <div className="space-y-2 mb-3">
                        <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                      </div>
                      <div className="h-64 rounded-lg bg-gray-200 dark:bg-gray-700 mb-3" />
                      <div className="flex gap-4">
                        <div className="h-8 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
                        <div className="h-8 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
                        <div className="h-8 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {isAuthenticated && (
                    <PostComposer
                      onOpenComposer={() => { setComposerInitialFiles(null); setComposerOpen(true); }}
                      onOpenWithImages={(files) => { setComposerInitialFiles(files); setComposerOpen(true); }}
                    />
                  )}
                  <PostFeed
                    fetchFn={fetchFeed}
                    emptyMessage="No posts yet. Be the first to share!"
                    refreshKey={feedRefreshKey}
                    onOpenDetail={(post, editMode) => {
                      if (editMode) {
                        setEditingPost(post);
                        setComposerOpen(true);
                      } else {
                        openPostDirect(post);
                      }
                    }}
                  />
                </>
              )}
            </div>
          </main>

          {/* Right Panel */}
          <aside className="w-full xl:w-80 flex-shrink-0 hidden xl:block">
            <RightPanel />
          </aside>
        </div>
      </div>
      {/* Composer modal — opens when clicking the compact composer trigger */}
      <PostComposerModal
        isOpen={composerOpen}
        onClose={() => { setComposerOpen(false); setComposerInitialFiles(null); setEditingPost(null); }}
        onPostCreated={() => {
          setComposerOpen(false);
          setComposerInitialFiles(null);
          setEditingPost(null);
          setFeedRefreshKey((k) => k + 1);
        }}
        initialFiles={composerInitialFiles}
        editingPost={editingPost}
      />
      <BottomNav />
    </div>
  );
}
