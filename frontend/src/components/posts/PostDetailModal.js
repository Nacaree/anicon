"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, ChevronLeft, MoreHorizontal, Pencil, Trash2, Repeat2 } from "lucide-react";
import { RoleBadge } from "@/components/profile/RoleBadge";
import { useAuth } from "@/context/AuthContext";
import { useAuthGate } from "@/context/AuthGateContext";
import { postsApi } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PostImageCarousel from "./PostImageCarousel";
import PostActions from "./PostActions";
import CommentSection from "./CommentSection";
import CommentInput from "./CommentInput";
import HashtagText from "./HashtagText";

/**
 * Instagram-style post detail modal.
 * Posts with images: side-by-side layout — image fixed on left, comments scrollable on right.
 * Text-only posts: single-column layout with comments below.
 * Pushes /posts/[id] to URL for shareability.
 */
export default function PostDetailModal({ post: initialPost, isOpen, onClose, onPostDeleted, onEdit }) {
  const { user, isAuthenticated } = useAuth();
  const { requireAuth } = useAuthGate();
  // For reposts, inherit the original post's like/repost state into the wrapper
  const [post, setPost] = useState(() => mergeRepostState(initialPost, user?.id));
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Tracks the latest comment added from the sticky input, passed to CommentSection
  const [externalComment, setExternalComment] = useState(null);
  // Heart burst animation on double-click (Instagram-style, same as portfolio lightbox)
  const [showHeartAnim, setShowHeartAnim] = useState(false);

  // Submit a comment from the sticky input and pass it to CommentSection
  const handleExternalComment = async (text) => {
    const displayId = (isRepost ? post?.originalPost : post)?.id;
    const newComment = await postsApi.addComment(displayId, text);
    setExternalComment(newComment);
  };

  // Sync post state when a new post is opened
  useEffect(() => {
    if (initialPost) setPost(mergeRepostState(initialPost, user?.id));
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

  // For likes/reposts on reposted posts, target the original post — not the repost wrapper
  const targetPostId = isRepost && post?.originalPost ? post.originalPost.id : post?.id;

  const handleLike = async () => {
    const wasLiked = post.likedByCurrentUser;
    // Optimistic update — for reposts, update BOTH the wrapper and originalPost
    // because PostActions merges them with ||, so originalPost must also change
    setPost((p) => ({
      ...p,
      likedByCurrentUser: !wasLiked,
      likeCount: wasLiked ? p.likeCount - 1 : p.likeCount + 1,
      ...(p.originalPost ? {
        originalPost: {
          ...p.originalPost,
          likedByCurrentUser: !wasLiked,
          likeCount: wasLiked ? p.originalPost.likeCount - 1 : p.originalPost.likeCount + 1,
        },
      } : {}),
    }));
    try {
      if (wasLiked) await postsApi.unlikePost(targetPostId);
      else await postsApi.likePost(targetPostId);
    } catch {
      setPost((p) => ({
        ...p,
        likedByCurrentUser: wasLiked,
        likeCount: wasLiked ? p.likeCount + 1 : p.likeCount - 1,
        ...(p.originalPost ? {
          originalPost: {
            ...p.originalPost,
            likedByCurrentUser: wasLiked,
            likeCount: wasLiked ? p.originalPost.likeCount + 1 : p.originalPost.likeCount - 1,
          },
        } : {}),
      }));
    }
  };

  const handleRepost = async () => {
    const wasReposted = post.repostedByCurrentUser;
    // Optimistic update — for reposts, update BOTH the wrapper and originalPost
    // because PostActions merges them with ||, so originalPost must also change
    setPost((p) => ({
      ...p,
      repostedByCurrentUser: !wasReposted,
      repostCount: wasReposted ? p.repostCount - 1 : p.repostCount + 1,
      ...(p.originalPost ? {
        originalPost: {
          ...p.originalPost,
          repostedByCurrentUser: !wasReposted,
          repostCount: wasReposted ? p.originalPost.repostCount - 1 : p.originalPost.repostCount + 1,
        },
      } : {}),
    }));
    try {
      if (wasReposted) await postsApi.undoRepost(targetPostId);
      else await postsApi.repost(targetPostId);
    } catch {
      setPost((p) => ({
        ...p,
        repostedByCurrentUser: wasReposted,
        repostCount: wasReposted ? p.repostCount + 1 : p.repostCount - 1,
        ...(p.originalPost ? {
          originalPost: {
            ...p.originalPost,
            repostedByCurrentUser: wasReposted,
            repostCount: wasReposted ? p.originalPost.repostCount + 1 : p.originalPost.repostCount - 1,
          },
        } : {}),
      }));
    }
  };

  // Instagram-style double-click on image — only likes, never unlikes
  const handleDoubleClick = () => {
    setShowHeartAnim(true);
    setTimeout(() => setShowHeartAnim(false), 800);

    if (post.likedByCurrentUser) return; // Already liked — just show the animation
    requireAuth(() => handleLike());
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
            className="p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <MoreHorizontal className="w-5 h-5 text-gray-400" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-8 z-20 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[120px]">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowMenu(false); onEdit?.(post); }}
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
    <HashtagText
      text={displayPost.textContent}
      className="text-gray-800 dark:text-gray-200 text-[15px]"
    />
  );

  /** Action bar (like, comment, repost) */
  const actionBar = (
    <PostActions
      post={isRepost
        ? { ...displayPost, likedByCurrentUser: post.likedByCurrentUser, repostedByCurrentUser: post.repostedByCurrentUser, likeCount: displayPost.likeCount, commentCount: displayPost.commentCount, repostCount: displayPost.repostCount }
        : post}
      isOwnPost={user?.id === displayPost?.author?.id}
      onLike={handleLike}
      onComment={() => {}}
      onRepost={handleRepost}
    />
  );

  // ========================================
  // RENDER — two layouts based on whether post has images
  // ========================================

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center animate-in fade-in-0 duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Close button — desktop only, outside the modal card */}
      <button
        onClick={onClose}
        className="hidden md:block absolute top-4 right-4 z-20 p-2.5 rounded-full bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 shadow-sm transition-colors"
      >
        <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>

      {hasImages ? (
        /* ===== SIDE-BY-SIDE LAYOUT (Instagram-style) ===== */
        <div className="relative z-10 flex flex-col md:flex-row w-full md:max-w-6xl h-full md:h-[90vh] md:mx-4 md:rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
          {/* Left: Image — fixed, no scroll, black background for contrast.
              max-w-[calc(100%-400px)] ensures the comment panel always stays visible.
              Double-click to like (Instagram-style) — only likes, never unlikes. */}
          <div
            className="relative w-full h-[45vh] md:h-auto md:flex-1 md:min-w-0 md:max-w-[calc(100%-400px)] bg-black flex items-center justify-center overflow-hidden shrink-0"
            onDoubleClick={handleDoubleClick}
          >
            <PostImageCarousel images={displayPost.images} className="w-full h-full rounded-none bg-black" />

            {/* Heart burst animation on double-click — orange gradient to red, same as portfolio lightbox */}
            {showHeartAnim && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <svg className="w-20 h-20 drop-shadow-lg animate-heart-burst" viewBox="0 0 24 24" fill="none">
                  <defs>
                    <linearGradient id="post-heart-burst-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FF7927" />
                      <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
                    fill="url(#post-heart-burst-gradient)"
                    stroke="url(#post-heart-burst-gradient)"
                    strokeWidth="1"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Right: Author + text + actions + comments — scrollable */}
          <div className="w-full md:w-100 flex-1 md:flex-initial md:shrink-0 flex flex-col min-h-0">
            {/* Mobile close header — back arrow, visible only on mobile */}
            <div className="flex items-center h-11 px-2 border-b border-gray-100 dark:border-gray-800 md:hidden">
              <button onClick={onClose} className="p-2 -ml-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <span className="flex-1 text-center text-sm font-semibold text-gray-900 dark:text-gray-100 pr-8">Post</span>
            </div>
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
              <CommentSection key={displayPost.id} postId={displayPost.id} noBorder hideInput externalComment={externalComment} />
            </div>

            {/* Action bar + comment input — fixed at bottom */}
            <div className="border-t border-gray-100 dark:border-gray-800">
              <div className="px-3 py-2">
                {actionBar}
              </div>
              <div className="px-3 pb-3">
                {isAuthenticated ? (
                  <CommentInput placeholder="Write a comment..." onSubmit={handleExternalComment} />
                ) : (
                  <button
                    onClick={() => requireAuth(() => {})}
                    className="w-full text-sm text-gray-400 dark:text-gray-500 text-center py-2 hover:text-orange-500 transition-colors"
                  >
                    Log in to comment
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ===== SINGLE-COLUMN LAYOUT (text-only posts) ===== */
        <div className="relative z-10 w-full md:max-w-2xl h-full md:h-auto md:max-h-[90vh] md:mx-4 flex flex-col min-h-0 md:rounded-xl bg-white dark:bg-gray-900 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
          {/* Mobile close header */}
          <div className="flex items-center h-11 px-2 border-b border-gray-100 dark:border-gray-800 md:hidden">
            <button onClick={onClose} className="p-2 -ml-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <span className="flex-1 text-center text-sm font-semibold text-gray-900 dark:text-gray-100 pr-8">Post</span>
          </div>
          <div className="p-4">
            {repostHeader}
            {authorHeader}
            {textContent && <div className="mt-3">{textContent}</div>}
            <div className="mt-2">{actionBar}</div>
          </div>
          {/* Comments — scrollable */}
          <div className="flex-1 overflow-y-auto">
            <CommentSection key={displayPost.id} postId={displayPost.id} hideInput externalComment={externalComment} />
          </div>
          {/* Comment input — sticky at bottom */}
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800">
            {isAuthenticated ? (
              <CommentInput placeholder="Write a comment..." onSubmit={handleExternalComment} />
            ) : (
              <button
                onClick={() => requireAuth(() => {})}
                className="w-full text-sm text-gray-400 dark:text-gray-500 text-center py-2 hover:text-orange-500 transition-colors"
              >
                Log in to comment
              </button>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation modal — matches the "Not going?" modal design */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Delete post ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            This post will be permanently removed. This action cannot be undone.
          </p>
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-full
                transition-all duration-300 hover:scale-[1.02]
                hover:shadow-[0_4px_20px_rgba(255,121,39,0.4)] active:scale-[0.98]"
            >
              Keep it
            </button>
            <button
              onClick={confirmDelete}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-full
                transition-all duration-300 hover:scale-[1.02]
                hover:shadow-[0_4px_20px_rgba(239,68,68,0.4)] active:scale-[0.98]"
            >
              Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>
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

/**
 * For reposts, inherit the original post's like/repost state into the wrapper.
 * Also marks repostedByCurrentUser=true when the current user authored the
 * repost wrapper, since the backend flag may only be set on the original.
 */
function mergeRepostState(post, currentUserId) {
  if (!post?.originalPost) return post;
  const isOwnRepost = currentUserId && post.author?.id === currentUserId;
  return {
    ...post,
    likedByCurrentUser: post.likedByCurrentUser || post.originalPost.likedByCurrentUser,
    repostedByCurrentUser: isOwnRepost || post.repostedByCurrentUser || post.originalPost.repostedByCurrentUser,
  };
}
