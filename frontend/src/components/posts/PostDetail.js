"use client";

import { useState, useEffect } from "react";
import { postsApi } from "@/lib/api";
import PostCard from "./PostCard";
import CommentSection from "./CommentSection";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shared post detail view — used by both PostDetailModal and /posts/[id] page.
 * Shows the full post card + comment section below it.
 */
export default function PostDetail({ postId, initialPost = null, onPostDeleted }) {
  const [post, setPost] = useState(initialPost);
  const [loading, setLoading] = useState(!initialPost);

  useEffect(() => {
    // If we already have the post data (passed from feed), skip fetching
    if (initialPost) return;

    const fetchPost = async () => {
      try {
        const data = await postsApi.getPost(postId);
        setPost(data);
      } catch (err) {
        console.error("Failed to load post:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [postId, initialPost]);

  if (loading) {
    return (
      <div className="animate-pulse p-4">
        <div className="flex items-center gap-3 mb-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
        </div>
        <Skeleton className="h-4 w-full rounded mb-2" />
        <Skeleton className="h-4 w-3/4 rounded mb-3" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-gray-500 dark:text-gray-400">Post not found</p>
      </div>
    );
  }

  return (
    <div>
      {/* Post content — no bottom margin since comments follow immediately */}
      <PostCard post={post} onPostDeleted={onPostDeleted} />

      {/* Comments section */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 -mt-1">
        <CommentSection postId={post.id} />
      </div>
    </div>
  );
}
