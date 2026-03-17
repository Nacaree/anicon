"use client";

import { useCallback, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useInfiniteScroll } from "@/lib/hooks/useInfiniteScroll";
import PostCard from "./PostCard";

/**
 * Generic infinite scroll feed container.
 * Works for both global feed (home page) and user-specific feed (profile HomeTab).
 *
 * @param {Function} fetchFn - Async function: (cursor) => { posts, nextCursor }
 * @param {string} emptyMessage - Text shown when there are no posts
 * @param {number} refreshKey - Increment to force feed reset (e.g. logo click on home page)
 * @param {Function} onOpenDetail - Called when a post is clicked to open detail modal
 */
export default function PostFeed({ fetchFn, emptyMessage = "No posts yet", refreshKey = 0, onOpenDetail }) {
  const { items, setItems, loading, initialLoading, hasMore, sentinelRef, reload } = useInfiniteScroll(fetchFn);

  // Reload feed when refreshKey changes (e.g. after creating a post or logo click).
  // Uses the hook's reload() which resets state and fetches page 1 atomically,
  // avoiding the stale initialLoading/hasMore bug from reset() + manual fetch.
  useEffect(() => {
    if (refreshKey > 0) {
      reload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const handlePostDeleted = useCallback((postId) => {
    setItems((prev) => prev.filter((p) => p.id !== postId));
  }, [setItems]);

  // Initial loading skeleton
  if (initialLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-4xl mb-4">📝</div>
        <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div>
      {items.map((post) => (
        <PostCard
          key={`${post.id}-${refreshKey}`}
          post={post}
          onPostDeleted={handlePostDeleted}
          onOpenDetail={onOpenDetail}
        />
      ))}

      {/* Sentinel element for IntersectionObserver to trigger loading more */}
      {hasMore && (
        <div ref={sentinelRef} className="py-4">
          {loading && <PostCardSkeleton />}
        </div>
      )}

      {/* End of feed indicator */}
      {!hasMore && items.length > 0 && (
        <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-6">
          You&apos;ve reached the end
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton loader for a post card — matches PostCard layout.
 */
function PostCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 mb-3 animate-pulse">
      {/* Author header */}
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
      </div>
      {/* Text */}
      <div className="space-y-2 mb-3 pl-1">
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-3/4 rounded" />
      </div>
      {/* Image */}
      <Skeleton className="rounded-lg mb-3 h-64" />
      {/* Action buttons */}
      <div className="flex gap-4">
        <Skeleton className="h-8 w-16 rounded-full" />
        <Skeleton className="h-8 w-16 rounded-full" />
        <Skeleton className="h-8 w-16 rounded-full" />
      </div>
    </div>
  );
}
