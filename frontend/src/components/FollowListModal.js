"use client";

import { useState, useEffect } from "react";
import { followApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { FollowButton } from "@/components/FollowButton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";

// Modal that shows a list of followers or following for a given user.
// Opens with a tab selector: "Followers" or "Following".
// Each row shows avatar, name, username, role badge, and a follow button.
export function FollowListModal({ userId, username, initialTab = "followers", followerCount = 0, followingCount = 0, open, onOpenChange }) {
  const { user } = useAuth();
  const [tab, setTab] = useState(initialTab);
  const [followers, setFollowers] = useState(null);
  const [following, setFollowing] = useState(null);
  const [loading, setLoading] = useState(false);

  // Sync tab when initialTab prop changes (e.g. clicking "followers" vs "following")
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  // Fetch both lists in parallel when modal opens so tab switching is instant.
  // Backend returns isFollowing per user when authenticated, so FollowButtons render instantly.
  useEffect(() => {
    if (!open || !userId) return;
    if (followers !== null && following !== null) return;

    setLoading(true);
    Promise.all([
      followApi.getFollowers(userId),
      followApi.getFollowing(userId),
    ])
      .then(([followersData, followingData]) => {
        setFollowers(followersData);
        setFollowing(followingData);
      })
      .catch((err) => console.error("Failed to load follow lists:", err))
      .finally(() => setLoading(false));
  }, [open, userId]);

  // Keep cached lists on close so FollowButtons don't remount and flash on reopen
  const handleOpenChange = (isOpen) => {
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-center">{tab === "followers" ? "Followers" : "Following"}</DialogTitle>
        </DialogHeader>

        {/* Tab switcher with sliding underline indicator */}
        <div className="relative flex border-b">
          {/* Sliding underline — animates to follow the active tab */}
          <div
            className="absolute bottom-0 h-0.5 w-1/2 bg-[#FF7927] transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(${tab === "followers" ? 0 : 100}%)` }}
          />
          <button
            onClick={() => setTab("followers")}
            className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors duration-300 cursor-pointer ${
              tab === "followers"
                ? "text-[#FF7927]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Followers{followerCount > 0 ? ` (${followerCount})` : ""}
          </button>
          <button
            onClick={() => setTab("following")}
            className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors duration-300 cursor-pointer ${
              tab === "following"
                ? "text-[#FF7927]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Following{followingCount > 0 ? ` (${followingCount})` : ""}
          </button>
        </div>

        {/* User lists — both rendered to preserve FollowButton state, toggled via CSS */}
        <div className="flex-1 overflow-y-auto -mx-6 px-6 relative" style={{ scrollbarGutter: "stable" }}>
          {loading ? (
            <div className="space-y-4 py-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-28 bg-muted rounded" />
                    <div className="h-3 w-20 bg-muted rounded" />
                  </div>
                  <div className="h-8 w-20 bg-muted rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Followers list — no opacity transition to prevent flash when opening on "following" tab */}
              <div className={tab === "followers" ? "" : "opacity-0 absolute inset-0 px-6 overflow-y-auto pointer-events-none"} style={tab !== "followers" ? { scrollbarGutter: "stable" } : undefined}>
                <UserList list={followers} emptyMessage="No followers yet" currentUserId={user?.id} onOpenChange={onOpenChange} />
              </div>
              {/* Following list */}
              <div className={tab === "following" ? "" : "opacity-0 absolute inset-0 px-6 overflow-y-auto pointer-events-none"} style={tab !== "following" ? { scrollbarGutter: "stable" } : undefined}>
                <UserList list={following} emptyMessage="Not following anyone" currentUserId={user?.id} onOpenChange={onOpenChange} />
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Renders a list of users or an empty-state message
function UserList({ list, emptyMessage, currentUserId, onOpenChange }) {
  if (list?.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        {emptyMessage}
      </div>
    );
  }
  return (
    <div className="space-y-1 py-2">
      {list?.map((person, i) => (
        <UserRow key={person.id} person={person} currentUserId={currentUserId} onOpenChange={onOpenChange} index={i} />
      ))}
    </div>
  );
}

// Individual user row in the follower/following list.
// Staggered fade-in: each row slides up with a slight delay based on its index.
function UserRow({ person, currentUserId, onOpenChange, index = 0 }) {
  const initials = (person.displayName || person.username)
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  return (
    <div
      className="flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-muted/50 transition-all duration-300 ease-out animate-[fadeSlideUp_0.3s_ease-out_both]"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Avatar + info link to profile */}
      <Link
        href={`/profiles/${person.username}`}
        onClick={() => onOpenChange(false)}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        <Avatar className="!w-10 !h-10 shrink-0">
          <AvatarImage src={person.avatarUrl} alt={person.displayName || person.username} className="object-cover" />
          <AvatarFallback className="text-xs bg-muted">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <span className="font-medium text-sm truncate leading-none block">{person.displayName || person.username}</span>
          <span className="text-xs text-muted-foreground leading-none">@{person.username}</span>
        </div>
      </Link>

      {/* Follow button — hidden for own row. initialIsFollowing from backend skips individual status API calls. */}
      {person.id !== currentUserId && (
        <FollowButton userId={person.id} size="sm" initialIsFollowing={person.isFollowing} />
      )}
    </div>
  );
}
