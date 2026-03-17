"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, MoreHorizontal, Pencil, Trash2, Repeat2 } from "lucide-react";
import { RoleBadge } from "@/components/profile/RoleBadge";
import { useAuth } from "@/context/AuthContext";
import { postsApi } from "@/lib/api";
import PostImageCarousel from "./PostImageCarousel";
import PostActions from "./PostActions";
import CommentSection from "./CommentSection";

/**
 * Instagram-style post detail modal.
 * Posts with images: side-by-side layout — image fixed on left, comments scrollable on right.
 * Text-only posts: single-column layout with comments below.
 * Pushes /posts/[id] to URL for shareability.
 */
export default function PostDetailModal({ post: initialPost, isOpen, onClose, onPostDeleted }) {
  const { user } = useAuth();
  const [post, setPost] = useState(initialPost);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sync post state when a new post is opened
  useEffect(() => {
    if (initialPost) setPost(initialPost);
  }, [initialPost]);

  const isOwner = user?.id === post?.author?.id;
  const isRepost = post?.originalPost !== undefined && post?.originalPost !== null;
  const displayPost = isRepost ? post?.originalPost : post;
  const hasImages = displayPost?.images?.length > 0;

  // Push URL when modal opens, pop when it closes
  useEffect(() => {
    if (!isOpen || !post?.id) return;

    const previousUrl = window.location.pathname + window.location.search;
    window.history.pushState({ postModal: true }, "", `/posts/${post.id}`);

    const handlePopState = () => onClose();
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (window.location.pathname.startsWith("/posts/")) {
        window.history.replaceState(null, "", previousUrl);
      }
    };
  }, [isOpen, post?.id, onClose]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !post) return null;

  // ========================================
  // OPTIMISTIC HANDLERS
  // ========================================

  const handleLike = async () => {
    const wasLiked = post.likedByCurrentUser;
    setPost((p) => ({
      ...p,
      likedByCurrentUser: !wasLiked,
      likeCount: wasLiked ? p.likeCount - 1 : p.likeCount + 1,
    }));
    try {
      if (wasLiked) await postsApi.unlikePost(post.id);
      else await postsApi.likePost(post.id);
    } catch {
      setPost((p) => ({
        ...p,
        likedByCurrentUser: wasLiked,
        likeCount: wasLiked ? p.likeCount + 1 : p.likeCount - 1,
      }));
    }
  };

  const handleRepost = async () => {
    const wasReposted = post.repostedByCurrentUser;
    setPost((p) => ({
      ...p,
      repostedByCurrentUser: !wasReposted,
      repostCount: wasReposted ? p.repostCount - 1 : p.repostCount + 1,
    }));
    try {
      if (wasReposted) await postsApi.undoRepost(post.id);
      else await postsApi.repost(post.id);
    } catch {
      setPost((p) => ({
        ...p,
        repostedByCurrentUser: wasReposted,
        repostCount: wasReposted ? p.repostCount + 1 : p.repostCount - 1,
      }));
    }
  };

  const handleDelete = () => {
    setShowMenu(false);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      await postsApi.deletePost(post.id);
      onPostDeleted?.(post.id);
      onClose();
    } catch (err) {
      console.error("Failed to delete post:", err);
    }
  };

  const timeAgo = formatTimeAgo(post.createdAt);

  // ========================================
  // SHARED SUB-COMPONENTS
  // ========================================

  /** Author header with avatar, name, role badges, time, and menu */
  const authorHeader = displayPost && (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link href={`/profiles/${displayPost.author?.username}`}>
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
            {displayPost.author?.avatarUrl ? (
              <img
                src={displayPost.author.avatarUrl}
                alt={displayPost.author.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg font-bold">
                {(displayPost.author?.displayName || displayPost.author?.username || "?")[0].toUpperCase()}
              </div>
            )}
          </div>
        </Link>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              href={`/profiles/${displayPost.author?.username}`}
              className="font-semibold text-gray-900 dark:text-gray-100 hover:underline truncate"
            >
              {displayPost.author?.displayName || displayPost.author?.username}
            </Link>
            {displayPost.author?.roles?.filter((r) => r !== "fan").map((role) => (
              <RoleBadge key={role} role={role} size="sm" />
            ))}
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
            <span>@{displayPost.author?.username}</span>
            <span>·</span>
            <span>{timeAgo}</span>
            {displayPost.isEdited && (
              <>
                <span>·</span>
                <span className="text-xs">edited</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3-dot menu for own posts */}
      {isOwner && !isRepost && (
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <MoreHorizontal className="w-5 h-5 text-gray-400" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-8 z-20 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[120px]">
                <button
                  onClick={() => setShowMenu(false)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );

  /** Repost indicator shown above content */
  const repostHeader = isRepost && post.originalPost && (
    <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-2 pl-1">
      <Repeat2 className="w-4 h-4" />
      <Link href={`/profiles/${post.author?.username}`} className="font-medium hover:underline">
        {post.author?.displayName || post.author?.username}
      </Link>
      <span>reposted</span>
    </div>
  );

  /** Text content with expand/collapse */
  const textContent = displayPost?.textContent && (
    <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words text-[15px]">
      {displayPost.textContent}
    </p>
  );

  /** Action bar (like, comment, repost) */
  const actionBar = (
    <PostActions
      post={isRepost
        ? { ...displayPost, likedByCurrentUser: post.likedByCurrentUser, repostedByCurrentUser: post.repostedByCurrentUser, likeCount: displayPost.likeCount, commentCount: displayPost.commentCount, repostCount: displayPost.repostCount }
        : post}
      onLike={handleLike}
      onComment={() => {}}
      onRepost={handleRepost}
    />
  );

  // ========================================
  // RENDER — two layouts based on whether post has images
  // ========================================

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in-0 duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Close button — outside the modal card */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-20 p-1.5 rounded-full bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 shadow-sm transition-colors"
      >
        <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>

      {hasImages ? (
        /* ===== SIDE-BY-SIDE LAYOUT (Instagram-style) ===== */
        <div className="relative z-10 flex w-full max-w-6xl h-[90vh] mx-4 rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
          {/* Left: Image — fixed, no scroll, black background for contrast */}
          <div className="flex-1 min-w-0 bg-black flex items-center justify-center overflow-hidden">
            <PostImageCarousel images={displayPost.images} className="max-w-full max-h-full rounded-none bg-black" />
          </div>

          {/* Right: Author + text + actions + comments — scrollable */}
          <div className="w-[400px] flex-shrink-0 flex flex-col border-l border-gray-200 dark:border-gray-800">
            {/* Author header + caption */}
            <div className="px-4 pt-4 pb-2">
              {repostHeader}
              {authorHeader}
              {textContent && (
                <div className="mt-2">
                  {textContent}
                </div>
              )}
            </div>

            {/* Comments — scrollable area */}
            <div className="flex-1 overflow-y-auto">

              {/* Comments */}
              <CommentSection postId={post.id} noBorder />
            </div>

            {/* Action bar — fixed at bottom */}
            <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800">
              {actionBar}
            </div>
          </div>
        </div>
      ) : (
        /* ===== SINGLE-COLUMN LAYOUT (text-only posts) ===== */
        <div className="relative z-10 w-full max-w-2xl max-h-[90vh] mx-4 overflow-y-auto rounded-xl bg-white dark:bg-gray-900 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="p-4">
            {repostHeader}
            {authorHeader}
            {textContent && <div className="mt-3">{textContent}</div>}
            <div className="mt-2">{actionBar}</div>
          </div>
          <CommentSection postId={post.id} />
        </div>
      )}

      {/* Delete confirmation overlay — styled like the discard modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center animate-in fade-in-0 duration-150">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="relative z-10 w-full max-w-xs mx-4 rounded-xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
            <div className="p-6 text-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Delete post?
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This can't be undone.
              </p>
            </div>
            <div className="border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={confirmDelete}
                className="w-full py-3 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                Delete
              </button>
            </div>
            <div className="border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Format a timestamp into relative time (e.g. "2m", "3h", "5d", "Jan 15").
 */
function formatTimeAgo(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
