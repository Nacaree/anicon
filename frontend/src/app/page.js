"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/context/AuthContext";
import { postsApi } from "@/lib/api";
import PostComposer from "@/components/posts/PostComposer";
import PostComposerModal from "@/components/posts/PostComposerModal";
import PostFeed from "@/components/posts/PostFeed";
import PostDetailModal from "@/components/posts/PostDetailModal";

const FeaturedEvents = dynamic(
  () => import("@/components/FeaturedEvents"),
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
              <div key={i} className="rounded-xl h-40 sm:h-48 md:h-64 w-full sm:w-100 md:w-125 lg:w-150 bg-gray-300/50 shrink-0" />
            ))}
          </div>
        </div>
      </div>
    ),
  }
);

const EventSections = dynamic(
  () => import("@/components/EventSections"),
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
  const { isAuthenticated } = useAuth();
  // Incremented by the "anicon-home-refresh" custom event dispatched from Header
  // when the user clicks the logo while already on the homepage.
  // Passing this as `key` to FeaturedEvents and EventSections forces React to
  // unmount + remount them, re-running their useEffect data fetches.
  const [refreshKey, setRefreshKey] = useState(0);
  // Separate key for the feed so new posts prepend without remounting the whole feed
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  // Post detail modal state — opened when clicking a post in the feed
  const [detailPost, setDetailPost] = useState(null);
  // Composer modal state — opened when clicking the compact composer trigger
  const [composerOpen, setComposerOpen] = useState(false);
  // Files pre-selected from the composer's image button
  const [composerInitialFiles, setComposerInitialFiles] = useState(null);
  // Post being edited — when set, the composer opens in edit mode
  const [editingPost, setEditingPost] = useState(null);

  useEffect(() => {
    const refreshHandler = () => {
      setRefreshKey((k) => k + 1);
      setFeedRefreshKey((k) => k + 1);
    };
    // Open post detail modal when a notification is clicked (dispatched from NotificationItem)
    const openPostHandler = async (e) => {
      const { postId } = e.detail;
      if (!postId) return;
      try {
        const post = await postsApi.getPost(postId);
        if (post) setDetailPost(post);
      } catch (err) {
        console.error("Failed to load post from notification:", err);
      }
    };
    window.addEventListener("anicon-home-refresh", refreshHandler);
    window.addEventListener("anicon-open-post", openPostHandler);
    return () => {
      window.removeEventListener("anicon-home-refresh", refreshHandler);
      window.removeEventListener("anicon-open-post", openPostHandler);
    };
  }, []);

  // Re-fetch feed once auth resolves so liked/reposted state is accurate.
  // On hard refresh, the feed loads before the token is ready (bestEffortAuth),
  // so posts come back without personalized state. This bumps the feed key
  // once the token becomes available, triggering a reload with auth.
  useEffect(() => {
    if (isAuthenticated) {
      setFeedRefreshKey((k) => k + 1);
    }
  }, [isAuthenticated]);

  // Fetch function for the public feed — passed to PostFeed
  const fetchFeed = useCallback((cursor) => postsApi.getFeed(cursor), []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />

      {/* Content Wrapper - respects sidebar offset */}
      <div
        className={`${
          isSidebarCollapsed ? "md:ml-20" : "md:ml-64"
        } pt-16 transition-all duration-300`}
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

            {/* Social Feed — real posts from all users, capped width to match design */}
            <div className="mt-8 max-w-3xl mx-auto">
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
                    setDetailPost(post);
                  }
                }}
              />
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
      {/* Post detail modal — opens when clicking a post in the feed */}
      <PostDetailModal
        post={detailPost}
        isOpen={!!detailPost}
        onClose={() => setDetailPost(null)}
        onPostDeleted={(id) => {
          setDetailPost(null);
          setFeedRefreshKey((k) => k + 1);
        }}
        onEdit={(post) => {
          setDetailPost(null);
          setEditingPost(post);
          setComposerOpen(true);
        }}
      />
    </div>
  );
}
