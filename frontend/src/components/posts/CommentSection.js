"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAuthGate } from "@/context/AuthGateContext";
import { postsApi } from "@/lib/api";
import CommentCard from "./CommentCard";
import CommentInput from "./CommentInput";


/**
 * Full comment section for a post — shows comment list + input.
 * Fetches comments on mount, supports adding new top-level comments.
 */
export default function CommentSection({ postId, noBorder = false }) {
  const { isAuthenticated } = useAuth();
  const { requireAuth } = useAuthGate();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Reset state when switching to a different post so stale comments don't flash
    setComments([]);
    setLoading(true);
    loadComments();
  }, [postId]);

  const loadComments = async () => {
    try {
      const data = await postsApi.getComments(postId);
      setComments(data || []);
    } catch (err) {
      console.error("Failed to load comments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (text) => {
    const newComment = await postsApi.addComment(postId, text);
    // Append to top-level comments list
    setComments((prev) => [...prev, { ...newComment, replies: [] }]);
  };

  // Called when a reply is added to a top-level comment
  const handleReplyAdded = (newReply) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === newReply.parentId
          ? { ...c, replies: [...(c.replies || []), newReply] }
          : c
      )
    );
  };

  // Called when a comment or reply is deleted
  const handleCommentDeleted = (commentId) => {
    setComments((prev) => {
      // Try removing as a top-level comment
      const filtered = prev.filter((c) => c.id !== commentId);
      if (filtered.length < prev.length) return filtered;
      // If not found at top level, remove from replies
      return prev.map((c) => ({
        ...c,
        replies: (c.replies || []).filter((r) => r.id !== commentId),
      }));
    });
  };

  return (
    <div className={`px-4 py-3 ${noBorder ? "" : "border-t border-gray-200 dark:border-gray-800"}`}>
      {/* Comments list */}
      {comments.length > 0 ? (
        <div className="space-y-3 mb-4">
          {comments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              postId={postId}
              onCommentAdded={handleReplyAdded}
              onCommentDeleted={handleCommentDeleted}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
          No comments yet
        </p>
      )}

      {/* New comment input */}
      {isAuthenticated ? (
        <CommentInput
          placeholder="Write a comment..."
          onSubmit={handleAddComment}
        />
      ) : (
        <button
          onClick={() => requireAuth(() => {})}
          className="w-full text-sm text-gray-400 dark:text-gray-500 text-center py-2 hover:text-orange-500 transition-colors"
        >
          Log in to comment
        </button>
      )}
    </div>
  );
}
