"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Globe, ExternalLink } from "lucide-react";
import { searchApi } from "@/lib/api";
import HashtagText from "@/components/posts/HashtagText";

/**
 * Instant search dropdown rendered below the Header search input.
 * Shows top 3 results per category (People, Events, Posts) with "See all" links.
 *
 * Debounces API calls by 300ms. Fires only when query >= 2 chars.
 * Post results dispatch the global "anicon-open-post" event to open PostDetailModal.
 */
export default function SearchDropdown({ query, onClose }) {
  const router = useRouter();
  const [results, setResults] = useState({ users: [], events: [], posts: [], scrapedEvents: [] });
  const [loading, setLoading] = useState(false);

  // Debounced search — 300ms delay, cancelled on query change or unmount
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults({ users: [], events: [], posts: [], scrapedEvents: [] });
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      searchApi
        .search(query, "all", 3)
        .then((data) => setResults(data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const hasResults =
    results.users.length > 0 ||
    results.events.length > 0 ||
    results.posts.length > 0 ||
    results.scrapedEvents?.length > 0;

  // Navigate to a result and close the dropdown
  const goTo = (path) => {
    router.push(path);
    onClose();
  };

  // Open a post in the global PostDetailModal via custom event dispatch
  const openPost = (postId) => {
    window.dispatchEvent(
      new CustomEvent("anicon-open-post", { detail: { postId } }),
    );
    onClose();
  };

  return (
    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white rounded-xl shadow-lg border border-gray-200 max-h-[480px] overflow-y-auto">
      {loading ? (
        // Skeleton loading rows
        <div className="p-3 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-gray-200 animate-pulse rounded w-2/3" />
                <div className="h-3 bg-gray-100 animate-pulse rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : !hasResults && query.length >= 2 ? (
        // Empty state
        <div className="py-8 text-center">
          <svg
            className="w-8 h-8 text-gray-300 mx-auto mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <p className="text-sm text-gray-400">
            No results for &ldquo;{query}&rdquo;
          </p>
        </div>
      ) : (
        <>
          {/* People section */}
          {results.users.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 pt-3 pb-1">
                People
              </div>
              {results.users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => goTo(`/profiles/${user.username}`)}
                  className="w-full px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-3 text-left"
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                      <span className="text-sm text-gray-500 font-medium">
                        {(user.displayName || user.username || "?")
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {user.displayName || user.username}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      @{user.username}
                      {user.followerCount > 0 && (
                        <span className="ml-2">
                          {user.followerCount.toLocaleString()}{" "}
                          {user.followerCount === 1 ? "follower" : "followers"}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              <Link
                href={`/search?q=${encodeURIComponent(query)}&tab=users`}
                onClick={onClose}
                className="block text-sm text-[#FF7927] font-medium px-4 py-2 hover:bg-orange-50 transition-colors"
              >
                See all people
              </Link>
            </div>
          )}

          {/* Events section */}
          {results.events.length > 0 && (
            <div className={results.users.length > 0 ? "border-t" : ""}>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 pt-3 pb-1">
                Events
              </div>
              {results.events.map((event) => (
                <button
                  key={event.id}
                  onClick={() => goTo(`/events/${event.id}`)}
                  className="w-full px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-3 text-left"
                >
                  {event.coverImageUrl ? (
                    <img
                      src={event.coverImageUrl}
                      alt=""
                      className="rounded-lg object-cover shrink-0 w-12 h-9"
                    />
                  ) : (
                    <div className="w-12 h-9 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
                      <svg
                        className="w-4 h-4 text-gray-400"
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
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {event.title}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {event.eventDate &&
                        new Date(
                          event.eventDate + "T00:00:00",
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      {event.location && ` · ${event.location}`}
                    </div>
                  </div>
                </button>
              ))}
              <Link
                href={`/search?q=${encodeURIComponent(query)}&tab=events`}
                onClick={onClose}
                className="block text-sm text-[#FF7927] font-medium px-4 py-2 hover:bg-orange-50 transition-colors"
              >
                See all events
              </Link>
            </div>
          )}

          {/* Posts section */}
          {results.posts.length > 0 && (
            <div
              className={
                results.users.length > 0 || results.events.length > 0
                  ? "border-t"
                  : ""
              }
            >
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 pt-3 pb-1">
                Posts
              </div>
              {results.posts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => openPost(post.id)}
                  className="w-full px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-3 text-left"
                >
                  {post.author?.avatarUrl ? (
                    <img
                      src={post.author.avatarUrl}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                      <span className="text-xs text-gray-500 font-medium">
                        {(
                          post.author?.displayName ||
                          post.author?.username ||
                          "?"
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {post.author?.displayName || post.author?.username}
                    </div>
                    <HashtagText
                      text={post.textContent}
                      className="text-xs text-gray-500 line-clamp-1"
                    />
                  </div>
                </button>
              ))}
              <Link
                href={`/search?q=${encodeURIComponent(query)}&tab=posts`}
                onClick={onClose}
                className="block text-sm text-[#FF7927] font-medium px-4 py-2 hover:bg-orange-50 transition-colors"
              >
                See all posts
              </Link>
            </div>
          )}

          {/* Discovered (scraped events) section */}
          {results.scrapedEvents?.length > 0 && (
            <div
              className={
                results.users.length > 0 || results.events.length > 0 || results.posts.length > 0
                  ? "border-t"
                  : ""
              }
            >
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 pt-3 pb-1">
                Discovered
              </div>
              {results.scrapedEvents.map((event) => (
                <a
                  key={event.id}
                  href={event.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="w-full px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-3 text-left block"
                >
                  {event.coverImageUrl ? (
                    <img
                      src={event.coverImageUrl}
                      alt=""
                      className="rounded-lg object-cover shrink-0 w-12 h-9"
                    />
                  ) : (
                    <div className="w-12 h-9 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
                      <Globe className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate flex items-center gap-1">
                      {event.title}
                      <ExternalLink className="w-3 h-3 text-gray-400 shrink-0" />
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {event.eventDate &&
                        new Date(
                          event.eventDate + "T00:00:00",
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      {event.location && ` · ${event.location}`}
                      {event.sourcePlatform && (
                        <span className="ml-1 text-gray-400">
                          · {SOURCE_LABELS[event.sourcePlatform] || event.sourcePlatform}
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              ))}
              <Link
                href={`/search?q=${encodeURIComponent(query)}&tab=discovered`}
                onClick={onClose}
                className="block text-sm text-[#FF7927] font-medium px-4 py-2 hover:bg-orange-50 transition-colors"
              >
                See all discovered events
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Human-readable labels for scraped event source platforms */
const SOURCE_LABELS = {
  allevents: "AllEvents.in",
  kawaiicon: "KAWAII-CON",
  cjcc: "CJCC",
  bestofpp: "Best of Phnom Penh",
};
