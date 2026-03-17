"use client";

import { Heart, MessageCircle, Repeat2 } from "lucide-react";
import { useAuthGate } from "@/context/AuthGateContext";

/**
 * Post action bar — Like, Comment, Repost buttons with counts.
 * Follows the interactive chip pattern: hover:scale-[1.02] active:scale-[0.98].
 */
export default function PostActions({
  post,
  onLike,
  onComment,
  onRepost,
}) {
  const { requireAuth } = useAuthGate();

  const handleLike = (e) => {
    e.stopPropagation();
    requireAuth(() => onLike?.());
  };

  const handleComment = (e) => {
    e.stopPropagation();
    onComment?.();
  };

  const handleRepost = (e) => {
    e.stopPropagation();
    // Can't repost your own post (backend enforces too, but UX should prevent it)
    requireAuth(() => onRepost?.());
  };

  return (
    <div className="flex items-center gap-1">
      {/* Like button */}
      <button
        onClick={handleLike}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm
          hover:scale-[1.02] active:scale-[0.98] transition-all
          hover:bg-red-50 dark:hover:bg-red-950/30"
      >
        <Heart
          className={`w-[18px] h-[18px] transition-colors ${
            post.likedByCurrentUser
              ? "fill-red-500 text-red-500"
              : "text-gray-500 dark:text-gray-400"
          }`}
        />
        {post.likeCount > 0 && (
          <span
            className={`${
              post.likedByCurrentUser
                ? "text-red-500"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {post.likeCount}
          </span>
        )}
      </button>

      {/* Comment button */}
      <button
        onClick={handleComment}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm
          hover:scale-[1.02] active:scale-[0.98] transition-all
          hover:bg-blue-50 dark:hover:bg-blue-950/30
          text-gray-500 dark:text-gray-400"
      >
        <MessageCircle className="w-[18px] h-[18px]" />
        {post.commentCount > 0 && <span>{post.commentCount}</span>}
      </button>

      {/* Repost button */}
      <button
        onClick={handleRepost}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm
          hover:scale-[1.02] active:scale-[0.98] transition-all
          hover:bg-green-50 dark:hover:bg-green-950/30
          ${
            post.repostedByCurrentUser
              ? "text-green-500"
              : "text-gray-500 dark:text-gray-400"
          }`}
      >
        <Repeat2
          className={`w-[18px] h-[18px] ${
            post.repostedByCurrentUser ? "text-green-500" : ""
          }`}
        />
        {post.repostCount > 0 && <span>{post.repostCount}</span>}
      </button>
    </div>
  );
}
