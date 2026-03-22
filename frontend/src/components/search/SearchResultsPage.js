"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useSidebar } from "@/context/SidebarContext";
import { Globe, ExternalLink } from "lucide-react";
import { searchApi } from "@/lib/api";
import HashtagText from "@/components/posts/HashtagText";

const TABS = [
  { key: "all", label: "All" },
  { key: "users", label: "People" },
  { key: "events", label: "Events" },
  { key: "posts", label: "Posts" },
  { key: "discovered", label: "Discovered" },
];

// Maps tab key → index for the sliding underline offset.
// 5 tabs: indicator is w-1/5 and translates by 100% per step.
const TAB_INDEX = { all: 0, users: 1, events: 2, posts: 3, discovered: 4 };

/**
 * Full search results page at /search?q=term&tab=all.
 * Fetches up to 20 results per category with tab-based filtering.
 * "All" tab shows top 5 per category with "See all" links.
 */
export default function SearchResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isSidebarCollapsed } = useSidebar();

  const query = searchParams.get("q") || "";
  const tabParam = searchParams.get("tab") || "all";
  const [activeTab, setActiveTab] = useState(tabParam);
  const [results, setResults] = useState({ users: [], events: [], posts: [], scrapedEvents: [] });
  const [loading, setLoading] = useState(false);

  // In-memory cache keyed by "query:type:limit". Prevents redundant API calls
  // when PostDetailModal closes and restores the URL via replaceState(), which
  // causes useSearchParams() to re-evaluate and re-trigger this effect.
  const cacheRef = useRef({});

  // Sync tab state with URL param changes (e.g. browser back/forward)
  useEffect(() => {
    setActiveTab(tabParam);
  }, [tabParam]);

  // Fetch results when query or tab changes
  useEffect(() => {
    if (!query.trim()) {
      setResults({ users: [], events: [], posts: [], scrapedEvents: [] });
      return;
    }

    // "all" tab fetches everything with limit 5; specific tabs fetch limit 20
    // "discovered" tab maps to "scraped_events" type for the backend search API
    const type = activeTab === "all" ? "all" : activeTab === "discovered" ? "scraped_events" : activeTab;
    const limit = activeTab === "all" ? 5 : 20;
    const cacheKey = `${query}:${type}:${limit}`;

    // Use cached results if available — skip the API call entirely
    if (cacheRef.current[cacheKey]) {
      setResults(cacheRef.current[cacheKey]);
      return;
    }

    setLoading(true);
    searchApi
      .search(query, type, limit)
      .then((data) => {
        cacheRef.current[cacheKey] = data;
        setResults(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [query, activeTab]);

  // Switch tab and update URL (replace, not push, to avoid polluting history)
  const switchTab = (tab) => {
    setActiveTab(tab);
    router.replace(`/search?q=${encodeURIComponent(query)}&tab=${tab}`);
  };

  const hasResults =
    results.users.length > 0 ||
    results.events.length > 0 ||
    results.posts.length > 0 ||
    results.scrapedEvents?.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />
      <div
        className={`${isSidebarCollapsed ? "md:ml-20" : "md:ml-64"} pt-16 transition-all duration-300`}
      >
        <div className="px-4 sm:px-6 md:px-8 py-6 max-w-4xl mx-auto">
          {/* Page heading */}
          {query && (
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5">
              Results for &ldquo;{query}&rdquo;
            </h1>
          )}

          {/* Tabs */}
          {/* Tabs with sliding underline — same animation pattern as ProfileTabs */}
          <div className="border-b border-gray-200 mb-6">
            <div className="relative inline-flex">
              {/* Sliding underline — translates horizontally to follow the active tab */}
              <div
                className="absolute bottom-0 h-0.5 w-1/5 bg-[#FF7927] transition-transform duration-300 ease-in-out"
                style={{
                  transform: `translateX(${TAB_INDEX[activeTab] * 100}%)`,
                }}
              />
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => switchTab(tab.key)}
                  className={`w-20 pb-3 text-sm font-semibold transition-colors duration-300 ${
                    activeTab === tab.key
                      ? "text-[#FF7927]"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Results content */}
          {loading ? (
            <LoadingSkeleton activeTab={activeTab} />
          ) : !query.trim() ? (
            <EmptyState message="Type something to search" />
          ) : !hasResults ? (
            <EmptyState
              message={`No results found for "${query}"`}
              suggestion="Try different keywords or check for typos"
            />
          ) : activeTab === "all" ? (
            // "All" tab: show top 5 per category with "See all" links
            <div className="space-y-8">
              {results.users.length > 0 && (
                <ResultSection
                  title="People"
                  onSeeAll={() => switchTab("users")}
                >
                  <div className="space-y-1">
                    {results.users.map((user, i) => (
                      <RevealOnScroll key={user.id} delay={Math.min(i * 50, 500)}>
                        <UserResultCard user={user} />
                      </RevealOnScroll>
                    ))}
                  </div>
                </ResultSection>
              )}
              {results.events.length > 0 && (
                <ResultSection
                  title="Events"
                  onSeeAll={() => switchTab("events")}
                >
                  <div className="space-y-1">
                    {results.events.map((event, i) => (
                      <RevealOnScroll key={event.id} delay={Math.min(i * 50, 500)}>
                        <EventResultCard event={event} />
                      </RevealOnScroll>
                    ))}
                  </div>
                </ResultSection>
              )}
              {results.posts.length > 0 && (
                <ResultSection
                  title="Posts"
                  onSeeAll={() => switchTab("posts")}
                >
                  <div className="space-y-1">
                    {results.posts.map((post, i) => (
                      <RevealOnScroll key={post.id} delay={Math.min(i * 50, 500)}>
                        <PostResultCard post={post} />
                      </RevealOnScroll>
                    ))}
                  </div>
                </ResultSection>
              )}
              {results.scrapedEvents?.length > 0 && (
                <ResultSection
                  title="Discovered"
                  onSeeAll={() => switchTab("discovered")}
                >
                  <div className="space-y-1">
                    {results.scrapedEvents.map((event, i) => (
                      <RevealOnScroll key={event.id} delay={Math.min(i * 50, 500)}>
                        <DiscoveredEventCard event={event} />
                      </RevealOnScroll>
                    ))}
                  </div>
                </ResultSection>
              )}
            </div>
          ) : (
            // Individual tab: show all results for the selected type
            <div className="space-y-1">
              {activeTab === "users" &&
                results.users.map((user, i) => (
                  <RevealOnScroll key={user.id} delay={Math.min(i * 50, 500)}>
                    <UserResultCard user={user} />
                  </RevealOnScroll>
                ))}
              {activeTab === "events" &&
                results.events.map((event, i) => (
                  <RevealOnScroll key={event.id} delay={Math.min(i * 50, 500)}>
                    <EventResultCard event={event} />
                  </RevealOnScroll>
                ))}
              {activeTab === "posts" &&
                results.posts.map((post, i) => (
                  <RevealOnScroll key={post.id} delay={Math.min(i * 50, 500)}>
                    <PostResultCard post={post} />
                  </RevealOnScroll>
                ))}
              {activeTab === "discovered" &&
                results.scrapedEvents?.map((event, i) => (
                  <RevealOnScroll key={event.id} delay={Math.min(i * 50, 500)}>
                    <DiscoveredEventCard event={event} />
                  </RevealOnScroll>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Section wrapper for the "All" tab — title + "See all" link */
function ResultSection({ title, onSeeAll, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <button
          onClick={onSeeAll}
          className="text-sm text-[#FF7927] font-medium hover:underline"
        >
          See all
        </button>
      </div>
      {children}
    </div>
  );
}

/** User result row — avatar, name, username, follower count */
function UserResultCard({ user }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(`/profiles/${user.username}`)}
      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white hover:shadow-sm transition-all cursor-pointer text-left"
    >
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt=""
          className="w-12 h-12 rounded-full object-cover shrink-0"
        />
      ) : (
        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
          <span className="text-base text-gray-500 font-medium">
            {(user.displayName || user.username || "?").charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-gray-900 truncate">
          {user.displayName || user.username}
        </div>
        <div className="text-sm text-gray-500 truncate">
          @{user.username}
          {user.followerCount > 0 && (
            <span className="ml-2 text-gray-400">
              · {user.followerCount.toLocaleString()}{" "}
              {user.followerCount === 1 ? "follower" : "followers"}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/** Event result row — cover image, title, date, location, tags */
function EventResultCard({ event }) {
  const router = useRouter();

  const formattedDate = event.eventDate
    ? new Date(event.eventDate + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <button
      onClick={() => router.push(`/events/${event.id}`)}
      className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white hover:shadow-sm transition-all cursor-pointer text-left"
    >
      {event.coverImageUrl ? (
        <img
          src={event.coverImageUrl}
          alt=""
          className="rounded-lg object-cover shrink-0 w-28 h-20"
        />
      ) : (
        <div className="w-28 h-20 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
          <svg
            className="w-6 h-6 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-gray-900 truncate">
          {event.title}
        </div>
        <div className="text-sm text-gray-500 truncate">
          {formattedDate}
          {event.location && ` · ${event.location}`}
        </div>
        {/* Tags — glass style matching EventDetailInfo */}
        {event.tags && event.tags.length > 0 && (
          <div className="flex gap-1.5 mt-1 flex-wrap">
            {event.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs bg-white/60 border border-gray/70 px-3 py-1 rounded-full text-gray-700 backdrop-blur-sm"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

/** Post result row — author avatar, name, text preview, first image thumbnail */
function PostResultCard({ post }) {
  // Open post in the global PostDetailModal via custom event
  const openPost = () => {
    window.dispatchEvent(
      new CustomEvent("anicon-open-post", { detail: { postId: post.id } }),
    );
  };

  return (
    <button
      onClick={openPost}
      className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-white hover:shadow-sm transition-all cursor-pointer text-left"
    >
      {post.author?.avatarUrl ? (
        <img
          src={post.author.avatarUrl}
          alt=""
          className="w-12 h-12 rounded-full object-cover shrink-0 mt-0.5"
        />
      ) : (
        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-base text-gray-500 font-medium">
            {(post.author?.displayName || post.author?.username || "?")
              .charAt(0)
              .toUpperCase()}
          </span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-gray-900 truncate">
          {post.author?.displayName || post.author?.username}
          <span className="text-gray-400 font-normal ml-1.5">
            @{post.author?.username}
          </span>
        </div>
        <HashtagText
          text={post.textContent}
          className="text-sm text-gray-600 line-clamp-2 mt-0.5"
        />
        {/* Engagement counts */}
        <div className="flex gap-4 mt-1.5 text-xs text-gray-400">
          {post.likeCount > 0 && (
            <span>
              {post.likeCount} {post.likeCount === 1 ? "like" : "likes"}
            </span>
          )}
          {post.commentCount > 0 && (
            <span>
              {post.commentCount}{" "}
              {post.commentCount === 1 ? "comment" : "comments"}
            </span>
          )}
        </div>
      </div>
      {/* First image thumbnail */}
      {post.firstImageUrl && (
        <img
          src={post.firstImageUrl}
          alt=""
          className="rounded-lg object-cover shrink-0 w-14 h-14"
        />
      )}
    </button>
  );
}

/** Discovered (scraped) event result row — cover image, title, date, location, source badge, external link */
function DiscoveredEventCard({ event }) {
  const formattedDate = event.eventDate
    ? new Date(event.eventDate + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const sourceName = SCRAPED_SOURCE_LABELS[event.sourcePlatform] || event.sourcePlatform;

  return (
    <a
      href={event.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white hover:shadow-sm transition-all cursor-pointer text-left block"
    >
      {event.coverImageUrl ? (
        <img
          src={event.coverImageUrl}
          alt=""
          className="rounded-lg object-cover shrink-0 w-28 h-20"
        />
      ) : (
        <div className="w-28 h-20 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
          <Globe className="w-6 h-6 text-gray-400" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-gray-900 truncate flex items-center gap-1.5">
          {event.title}
          <ExternalLink className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        </div>
        <div className="text-sm text-gray-500 truncate">
          {formattedDate}
          {event.location && ` · ${event.location}`}
        </div>
        <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
          <Globe className="w-3 h-3" />
          {sourceName}
        </div>
      </div>
    </a>
  );
}

/** Human-readable labels for scraped event source platforms */
const SCRAPED_SOURCE_LABELS = {
  allevents: "AllEvents.in",
  kawaiicon: "KAWAII-CON",
  cjcc: "CJCC",
  bestofpp: "Best of Phnom Penh",
};

/**
 * Scroll-reveal wrapper — fades and slides children in when they enter the viewport.
 * Uses IntersectionObserver (same pattern as EventsPageCard). Fires once per element.
 */
function RevealOnScroll({ children, delay = 0 }) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -20px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform] duration-300 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      }`}
      style={delay > 0 ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

/** Tab-aware loading skeleton — renders shapes matching the active tab's content */
function LoadingSkeleton({ activeTab }) {
  if (activeTab === "users") return <UserSkeletonList count={6} />;
  if (activeTab === "events") return <EventSkeletonList count={6} />;
  if (activeTab === "posts") return <PostSkeletonList count={6} />;
  if (activeTab === "discovered") return <EventSkeletonList count={6} />;

  // "all" tab — show a mix of each type with section headers
  return (
    <div className="space-y-8">
      <SkeletonSection>
        <UserSkeletonList count={2} />
      </SkeletonSection>
      <SkeletonSection>
        <EventSkeletonList count={2} />
      </SkeletonSection>
      <SkeletonSection>
        <PostSkeletonList count={2} />
      </SkeletonSection>
    </div>
  );
}

/** Skeleton section header — mimics ResultSection's title + "See all" layout */
function SkeletonSection({ children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 bg-gray-200 animate-pulse rounded w-20" />
        <div className="h-3 bg-gray-100 animate-pulse rounded w-14" />
      </div>
      {children}
    </div>
  );
}

/** User-shaped skeleton rows — circle avatar + name + username lines */
function UserSkeletonList({ count }) {
  return (
    <div className="space-y-1">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 animate-pulse rounded w-1/3" />
            <div className="h-3 bg-gray-100 animate-pulse rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Event-shaped skeleton rows — rectangular cover + title + date + tag pills */
function EventSkeletonList({ count }) {
  return (
    <div className="space-y-1">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3">
          <div className="w-28 h-20 rounded-lg bg-gray-200 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 animate-pulse rounded w-1/2" />
            <div className="h-3 bg-gray-100 animate-pulse rounded w-1/3" />
            <div className="flex gap-1.5">
              <div className="h-5 bg-gray-100 animate-pulse rounded-full w-14" />
              <div className="h-5 bg-gray-100 animate-pulse rounded-full w-16" />
              <div className="h-5 bg-gray-100 animate-pulse rounded-full w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Post-shaped skeleton rows — circle avatar + name + text body + engagement line */
function PostSkeletonList({ count }) {
  return (
    <div className="space-y-1">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3">
          <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 animate-pulse rounded w-2/5" />
            <div className="h-3 bg-gray-100 animate-pulse rounded w-full" />
            <div className="h-3 bg-gray-100 animate-pulse rounded w-3/4" />
            <div className="flex gap-4">
              <div className="h-3 bg-gray-100 animate-pulse rounded w-12" />
              <div className="h-3 bg-gray-100 animate-pulse rounded w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Empty state for no results or empty query */
function EmptyState({ message, suggestion }) {
  return (
    <div className="py-16 text-center">
      <svg
        className="w-12 h-12 text-gray-300 mx-auto mb-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <p className="text-gray-500 font-medium">{message}</p>
      {suggestion && (
        <p className="text-sm text-gray-400 mt-1">{suggestion}</p>
      )}
    </div>
  );
}
