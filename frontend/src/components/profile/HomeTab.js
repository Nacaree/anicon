'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePostModal } from '@/context/PostModalContext';
import { postsApi } from '@/lib/api';
import PostComposer from '@/components/posts/PostComposer';
import PostComposerModal from '@/components/posts/PostComposerModal';
import PostFeed from '@/components/posts/PostFeed';

/**
 * Profile HomeTab — shows the user's posts feed.
 * Owner sees a compact composer trigger that opens a modal; visitors see posts only.
 * Clicking a post opens the same detail modal as the main feed.
 */
export function HomeTab({ profile, isOwner }) {
  const { openPostDirect, registerCallbacks } = usePostModal();
  const [refreshKey, setRefreshKey] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerInitialFiles, setComposerInitialFiles] = useState(null);
  // Post being edited — when set, the composer opens in edit mode
  const [editingPost, setEditingPost] = useState(null);

  // Register feed-specific callbacks so the global PostDetailModal can refresh
  // this profile's feed on delete/edit
  useEffect(() => {
    return registerCallbacks({
      onPostDeleted: () => setRefreshKey((k) => k + 1),
      onEdit: (post) => {
        setEditingPost(post);
        setComposerOpen(true);
      },
    });
  }, [registerCallbacks]);

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
            onClose={() => { setComposerOpen(false); setComposerInitialFiles(null); setEditingPost(null); }}
            onPostCreated={() => {
              setComposerOpen(false);
              setComposerInitialFiles(null);
              setEditingPost(null);
              setRefreshKey((k) => k + 1);
            }}
            initialFiles={composerInitialFiles}
            editingPost={editingPost}
          />
        </>
      )}

      {/* User's posts feed with infinite scroll */}
      <PostFeed
        fetchFn={fetchUserPosts}
        emptyMessage={isOwner ? "Share your first post!" : "No posts yet"}
        refreshKey={refreshKey}
        onOpenDetail={(post, editMode) => {
          if (editMode) {
            setEditingPost(post);
            setComposerOpen(true);
          } else {
            openPostDirect(post);
          }
        }}
      />

    </div>
  );
}
