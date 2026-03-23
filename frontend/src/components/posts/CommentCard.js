"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAuthGate } from "@/context/AuthGateContext";
import { postsApi } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CommentInput from "./CommentInput";

/**
 * Single comment card with like button, reply toggle, and nested replies.
 * Top-level comments show expandable replies; replies are flat.
 */
export default function CommentCard({ comment, postId, onCommentAdded, onCommentDeleted }) {
  const { user } = useAuth();
  const { requireAuth } = useAuthGate();
  const [liked, setLiked] = useState(comment.likedByCurrentUser);
  const [likeCount, setLikeCount] = useState(comment.likeCount);
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isOwner = user?.id === comment.author?.id;
  const isTopLevel = comment.parentId === null || comment.parentId === undefined;
  const hasReplies = comment.replies?.length > 0;

  const timeAgo = formatTimeAgo(comment.createdAt);

  const handleLike = async () => {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => (wasLiked ? c - 1 : c + 1));
    try {
      if (wasLiked) {
        await postsApi.unlikeComment(comment.id);
      } else {
        await postsApi.likeComment(comment.id);
      }
    } catch {
      setLiked(wasLiked);
      setLikeCount((c) => (wasLiked ? c + 1 : c - 1));
    }
  };

  const handleReply = async (text) => {
    const newComment = await postsApi.addComment(postId, text, comment.id);
    onCommentAdded?.(newComment);
    setShowReplyInput(false);
    setShowReplies(true);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      await postsApi.deleteComment(comment.id);
      onCommentDeleted?.(comment.id);
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  };

  return (
    <div className="group">
      <div className="flex gap-2.5">
        {/* Avatar */}
        <Link href={`/profiles/${comment.author?.username}`} className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
            {comment.author?.avatarUrl ? (
              <img
                src={comment.author.avatarUrl}
                alt={comment.author.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-bold">
                {(comment.author?.displayName || comment.author?.username || "?")[0].toUpperCase()}
              </div>
            )}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          {/* Comment bubble */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-3 py-2">
            <div className="flex items-center gap-1.5">
              <Link
                href={`/profiles/${comment.author?.username}`}
                className="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:underline"
              >
                {comment.author?.displayName || comment.author?.username}
              </Link>
              <span className="text-xs text-gray-400">{timeAgo}</span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words mt-0.5">
              {comment.textContent}
            </p>
          </div>

          {/* Action row */}
          <div className="flex items-center gap-1 mt-1 ml-1">
            {/* Like */}
            <button
              onClick={() => requireAuth(handleLike)}
              className="flex items-center gap-1 text-xs py-2 px-2 rounded-full hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <Heart
                className={`w-3.5 h-3.5 ${
                  liked ? "fill-red-500 text-red-500" : "text-gray-400"
                }`}
              />
              {likeCount > 0 && (
                <span className={liked ? "text-red-500" : "text-gray-400"}>{likeCount}</span>
              )}
            </button>

            {/* Reply (only on top-level comments) */}
            {isTopLevel && (
              <button
                onClick={() => requireAuth(() => setShowReplyInput(!showReplyInput))}
                className="text-xs text-gray-400 py-2 px-2 rounded-full hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors"
              >
                Reply
              </button>
            )}

            {/* Delete (own comments only) */}
            {isOwner && (
              <button
                onClick={handleDelete}
                className="text-xs text-gray-400 py-2 px-2 rounded-full hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors opacity-0 group-hover:opacity-100"
              >
                Delete
              </button>
            )}
          </div>

          {/* Reply input — mb-1 prevents overlap with the main comment input below */}
          {showReplyInput && (
            <div className="mt-2 mb-1">
              <CommentInput
                placeholder={`Reply to ${comment.author?.displayName || comment.author?.username}...`}
                onSubmit={handleReply}
                autoFocus
              />
            </div>
          )}

          {/* Nested replies */}
          {isTopLevel && hasReplies && (
            <div className="mt-2">
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 font-medium"
              >
                {showReplies ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    Hide replies
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}
                  </>
                )}
              </button>

              {showReplies && (
                <div className="mt-2 space-y-2 pl-2">
                  {comment.replies.map((reply) => (
                    <CommentCard
                      key={reply.id}
                      comment={reply}
                      postId={postId}
                      onCommentDeleted={onCommentDeleted}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Delete confirmation modal — matches the "Not going?" modal design */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Delete comment ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            This comment will be permanently removed. This action cannot be undone.
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
