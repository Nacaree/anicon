"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { postsApi } from "@/lib/api";
import PostDetailModal from "@/components/posts/PostDetailModal";

const PostModalContext = createContext(null);

/**
 * Global provider for PostDetailModal.
 * Renders a single PostDetailModal instance that can be opened from any page
 * (e.g. notification clicks, shared post links). Pages with feeds can register
 * callbacks for post deletion/edit so the feed stays in sync.
 */
export function PostModalProvider({ children }) {
  const [post, setPost] = useState(null);
  // Ref for page-specific callbacks (onPostDeleted, onEdit) — registered by
  // pages with feeds so actions in the modal can update the feed.
  const callbacksRef = useRef({ onPostDeleted: null, onEdit: null });

  // Open a post by ID — fetches from API first
  const openPost = useCallback(async (postId) => {
    try {
      const fetched = await postsApi.getPost(postId);
      if (fetched) setPost(fetched);
    } catch (err) {
      console.error("Failed to load post:", err);
    }
  }, []);

  // Open a post with an already-fetched post object (used by feeds that have the data)
  const openPostDirect = useCallback((postData) => {
    setPost(postData);
  }, []);

  const closePost = useCallback(() => {
    setPost(null);
  }, []);

  /**
   * Register page-specific callbacks. Returns a cleanup function.
   * Usage in a page/component with a feed:
   *   useEffect(() => registerCallbacks({ onPostDeleted, onEdit }), []);
   */
  const registerCallbacks = useCallback(({ onPostDeleted, onEdit }) => {
    callbacksRef.current = { onPostDeleted, onEdit };
    return () => {
      callbacksRef.current = { onPostDeleted: null, onEdit: null };
    };
  }, []);

  // Listen for the custom event dispatched by NotificationItem
  useEffect(() => {
    const handler = (e) => {
      const { postId } = e.detail || {};
      if (postId) openPost(postId);
    };
    window.addEventListener("anicon-open-post", handler);
    return () => window.removeEventListener("anicon-open-post", handler);
  }, [openPost]);

  const value = { openPost, openPostDirect, closePost, registerCallbacks };

  return (
    <PostModalContext.Provider value={value}>
      {children}
      <PostDetailModal
        post={post}
        isOpen={!!post}
        onClose={closePost}
        onPostDeleted={(id) => {
          closePost();
          callbacksRef.current.onPostDeleted?.(id);
        }}
        onEdit={(editPost) => {
          closePost();
          callbacksRef.current.onEdit?.(editPost);
        }}
      />
    </PostModalContext.Provider>
  );
}

export function usePostModal() {
  const context = useContext(PostModalContext);
  if (!context) {
    throw new Error("usePostModal must be used within a PostModalProvider");
  }
  return context;
}
