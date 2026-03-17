"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Repeat2, Pencil, Trash2 } from "lucide-react";
import { RoleBadge } from "@/components/profile/RoleBadge";
import PostImageCarousel from "./PostImageCarousel";
import PostActions from "./PostActions";
import { useAuth } from "@/context/AuthContext";
import { postsApi } from "@/lib/api";

/**
 * Renders a single post card in the feed.
 * Handles: author header, repost header, text, image carousel, action bar.
 * Supports optimistic like/repost state updates.
 */
export default function PostCard({ post: initialPost, onPostDeleted, onOpenDetail }) {
  const { user } = useAuth();
  const [post, setPost] = useState(initialPost);
  const [showMenu, setShowMenu] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isOwner = user?.id === post.author?.id;
  const isRepost = post.originalPost !== undefined && post.originalPost !== null;
  // For reposts, display the original post's content
  const displayPost = isRepost ? post.originalPost : post;
  // Original post was deleted (ON DELETE SET NULL made originalPost null)
  const isOrphanedRepost = isRepost && !post.originalPost;

  // Format relative time (e.g. "2h", "3d", "Jan 5")
  const timeAgo = formatTimeAgo(post.createdAt);

  // ========================================
  // OPTIMISTIC HANDLERS
  // ========================================

  const handleLike = async () => {
    const wasLiked = post.likedByCurrentUser;
    // Optimistic update
    setPost((p) => ({
      ...p,
      likedByCurrentUser: !wasLiked,
      likeCount: wasLiked ? p.likeCount - 1 : p.likeCount + 1,
    }));
    try {
      if (wasLiked) {
        await postsApi.unlikePost(post.id);
      } else {
        await postsApi.likePost(post.id);
      }
    } catch {
      // Revert on error
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
      if (wasReposted) {
        await postsApi.undoRepost(post.id);
      } else {
        await postsApi.repost(post.id);
      }
    } catch {
      setPost((p) => ({
        ...p,
        repostedByCurrentUser: wasReposted,
        repostCount: wasReposted ? p.repostCount + 1 : p.repostCount - 1,
      }));
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this post?")) return;
    try {
      await postsApi.deletePost(post.id);
      onPostDeleted?.(post.id);
    } catch (err) {
      console.error("Failed to delete post:", err);
    }
    setShowMenu(false);
  };

  const handleComment = () => {
    onOpenDetail?.(post);
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 mb-3 w-full">
      {/* Repost header */}
      {isRepost && !isOrphanedRepost && (
        <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-2 pl-1">
          <Repeat2 className="w-4 h-4" />
          <Link
            href={`/profiles/${post.author?.username}`}
            className="font-medium hover:underline"
          >
            {post.author?.displayName || post.author?.username}
          </Link>
          <span>reposted</span>
        </div>
      )}

      {/* Orphaned repost fallback */}
      {isOrphanedRepost && (
        <div className="text-sm text-gray-400 dark:text-gray-500 italic py-4 text-center">
          Original post was deleted
        </div>
      )}

      {/* Main post content (for reposts, this shows the original post) */}
      {displayPost && (
        <>
          {/* Author header — mb-3 gives breathing room before images on text-less posts */}
          <div className="flex items-center justify-between mb-3">
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
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <MoreHorizontal className="w-5 h-5 text-gray-400" />
                </button>
                {showMenu && (
                  <>
                    {/* Backdrop to close menu */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 top-8 z-20 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[140px]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDetail?.(post, true); // true = edit mode
                          setShowMenu(false);
                        }}
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

          {/* Text content */}
          {displayPost.textContent && (
            <div className="mb-3 pl-1">
              <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                {!expanded && displayPost.textContent.length > 280
                  ? displayPost.textContent.slice(0, 280) + "..."
                  : displayPost.textContent}
              </p>
              {displayPost.textContent.length > 280 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(!expanded);
                  }}
                  className="text-sm text-orange-500 hover:text-orange-600 mt-1 font-medium"
                >
                  {expanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          )}

          {/* Image carousel — clicking opens post detail modal */}
          {displayPost.images?.length > 0 && (
            <div className="mb-3 cursor-pointer" onClick={() => onOpenDetail?.(post)}>
              <PostImageCarousel images={displayPost.images} />
            </div>
          )}

          {/* Action bar */}
          <PostActions
            post={isRepost ? { ...displayPost, likedByCurrentUser: post.likedByCurrentUser, repostedByCurrentUser: post.repostedByCurrentUser, likeCount: displayPost.likeCount, commentCount: displayPost.commentCount, repostCount: displayPost.repostCount } : post}
            onLike={handleLike}
            onComment={handleComment}
            onRepost={handleRepost}
          />
        </>
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
