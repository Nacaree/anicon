'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { postsApi } from '@/lib/api';
import PostComposer from '@/components/posts/PostComposer';
import PostComposerModal from '@/components/posts/PostComposerModal';
import PostFeed from '@/components/posts/PostFeed';
import PostDetailModal from '@/components/posts/PostDetailModal';

/**
 * Profile HomeTab — shows the user's posts feed.
 * Owner sees a compact composer trigger that opens a modal; visitors see posts only.
 * Clicking a post opens the same detail modal as the main feed.
 */
export function HomeTab({ profile, isOwner }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerInitialFiles, setComposerInitialFiles] = useState(null);
  // Post detail modal — opened when clicking a post in the feed
  const [detailPost, setDetailPost] = useState(null);

  // Fetch function for this specific user's posts
  const fetchUserPosts = useCallback(
    (cursor) => postsApi.getUserPosts(profile.id, cursor),
    [profile.id]
  );

  return (
    <div>
      {/* Show compact composer trigger for profile owner */}
      {isOwner && (
        <>
          <PostComposer
            onOpenComposer={() => { setComposerInitialFiles(null); setComposerOpen(true); }}
            onOpenWithImages={(files) => { setComposerInitialFiles(files); setComposerOpen(true); }}
          />
          <PostComposerModal
            isOpen={composerOpen}
            onClose={() => { setComposerOpen(false); setComposerInitialFiles(null); }}
            onPostCreated={() => {
              setComposerOpen(false);
              setComposerInitialFiles(null);
              setRefreshKey((k) => k + 1);
            }}
            initialFiles={composerInitialFiles}
          />
        </>
      )}

      {/* User's posts feed with infinite scroll */}
      <PostFeed
        fetchFn={fetchUserPosts}
        emptyMessage={isOwner ? "Share your first post!" : "No posts yet"}
        refreshKey={refreshKey}
        onOpenDetail={(post) => setDetailPost(post)}
      />

      {/* Post detail modal — opens when clicking a post in the feed */}
      <PostDetailModal
        post={detailPost}
        isOpen={!!detailPost}
        onClose={() => setDetailPost(null)}
        onPostDeleted={(id) => {
          setDetailPost(null);
          setRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
}
