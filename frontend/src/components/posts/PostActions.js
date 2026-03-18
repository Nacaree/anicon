"use client";

import { useState } from "react";
import { Heart, MessageCircle, Repeat2, Share, Check } from "lucide-react";
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
  const [copied, setCopied] = useState(false);

  const handleShare = (e) => {
    e.stopPropagation();
    // Use the original post's ID for reposts so the link points to the actual content
    const postId = post.originalPost?.id || post.id;
    const url = `${window.location.origin}/posts/${postId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

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
    <div className="flex items-center gap-1 w-full">
      {/* Like button */}
      <button
        onClick={handleLike}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm
          hover:scale-[1.02] active:scale-[0.98] transition-all
          hover:bg-red-50 dark:hover:bg-red-950/30"
      >
        <Heart
          className={`w-5 h-5 transition-colors ${
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
        <MessageCircle className="w-5 h-5" />
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
          className={`w-5 h-5 ${
            post.repostedByCurrentUser ? "text-green-500" : ""
          }`}
        />
        {post.repostCount > 0 && <span>{post.repostCount}</span>}
      </button>

      {/* Share button — copies post link to clipboard, pushed to far right */}
      <button
        onClick={handleShare}
        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm
          hover:scale-[1.02] active:scale-[0.98] transition-all
          hover:bg-orange-50 dark:hover:bg-orange-950/30
          text-gray-500 dark:text-gray-400"
      >
        {copied ? (
          <Check className="w-5 h-5 text-green-500" />
        ) : (
          <Share className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}
