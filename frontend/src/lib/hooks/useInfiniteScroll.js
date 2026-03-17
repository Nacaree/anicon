"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Reusable infinite scroll hook with cursor-based pagination.
 * Uses IntersectionObserver on a sentinel element to load more items
 * when the user scrolls near the bottom.
 *
 * @param {Function} fetchFn - Async function that takes a cursor and returns { posts, nextCursor }
 * @returns {Object} - { items, setItems, loading, initialLoading, hasMore, sentinelRef, reset }
 */
export function useInfiniteScroll(fetchFn) {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const sentinelRef = useRef(null);
  // Track the fetchFn identity to avoid stale closure issues
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;
  // Guard against React Strict Mode double-invoking the mount effect,
  // which would fetch the same page twice and append duplicate posts.
  const hasFetchedRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const result = await fetchFnRef.current(cursor);
      const newPosts = result?.posts ?? [];
      setItems((prev) => [...prev, ...newPosts]);
      setCursor(result?.nextCursor ?? null);
      setHasMore(result?.nextCursor != null);
    } catch (err) {
      console.error("Feed load error:", err);
      setHasMore(false);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [cursor, loading, hasMore]);

  // Initial load on mount — guarded to prevent duplicate fetch in Strict Mode
  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // IntersectionObserver watches sentinel element to trigger loading more
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loading && hasMore) {
          loadMore();
        }
      },
      { rootMargin: "200px" } // Start loading 200px before reaching bottom
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, loading, hasMore]);

  // Reset function — clears state without re-fetching (used internally)
  const reset = useCallback(() => {
    setItems([]);
    setCursor(null);
    setHasMore(true);
    setInitialLoading(true);
    setLoading(false);
    hasFetchedRef.current = false;
  }, []);

  // Reload function — resets state and immediately fetches page 1.
  // Properly updates all state (cursor, hasMore, initialLoading) unlike
  // calling reset() + fetchFn() separately which leaves state inconsistent.
  const reload = useCallback(async () => {
    setItems([]);
    setCursor(null);
    setHasMore(true);
    setLoading(true);
    setInitialLoading(true);
    hasFetchedRef.current = true;
    try {
      const result = await fetchFnRef.current(null);
      const newPosts = result?.posts ?? [];
      setItems(newPosts);
      setCursor(result?.nextCursor ?? null);
      setHasMore(result?.nextCursor != null);
    } catch (err) {
      console.error("Feed reload error:", err);
      setHasMore(false);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, []);

  return { items, setItems, loading, initialLoading, hasMore, sentinelRef, reset, reload };
}
