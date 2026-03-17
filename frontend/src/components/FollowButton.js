"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAuthGate } from "@/context/AuthGateContext";
import { followApi } from "@/lib/api";
import { Loader2 } from "lucide-react";

// Reusable follow/unfollow button with optimistic updates.
// Shows "Follow" (orange), "Following" (outline), or "Unfollow" (red on hover).
// Props:
//   userId — the target user's UUID
//   initialIsFollowing — skip the status check if the caller already knows
//   size — "sm" (compact, for cards) or "md" (default, for profiles)
//   onFollowChange — callback(delta) where delta is +1 (followed) or -1 (unfollowed)
//   className — additional classes
export function FollowButton({ userId, initialIsFollowing, size = "md", onFollowChange, className = "" }) {
  const { user } = useAuth();
  const { requireAuth } = useAuthGate();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing ?? null);
  const [loading, setLoading] = useState(false);
  const [hovering, setHovering] = useState(false);

  // Don't render anything if viewing own profile
  const isOwnProfile = user?.id === userId;

  // Fetch follow status on mount if not provided via prop
  useEffect(() => {
    if (isOwnProfile || initialIsFollowing != null || !user) return;
    let cancelled = false;

    followApi.getStatus(userId)
      .then((data) => {
        if (!cancelled) setIsFollowing(data.isFollowing);
      })
      .catch(() => {
        // Silently fail — button will show "Follow" as default
        if (!cancelled) setIsFollowing(false);
      });

    return () => { cancelled = true; };
  }, [userId, user, isOwnProfile, initialIsFollowing]);

  const handleClick = useCallback(() => {
    requireAuth(async () => {
      if (loading) return;
      setLoading(true);

      const wasFollowing = isFollowing;

      // Optimistic update
      setIsFollowing(!wasFollowing);
      onFollowChange?.(wasFollowing ? -1 : 1);

      try {
        if (wasFollowing) {
          await followApi.unfollow(userId);
        } else {
          await followApi.follow(userId);
        }
      } catch (err) {
        // Revert on failure
        setIsFollowing(wasFollowing);
        onFollowChange?.(wasFollowing ? 1 : -1);
        console.error("Follow action failed:", err);
      } finally {
        setLoading(false);
      }
    });
  }, [requireAuth, loading, isFollowing, userId, onFollowChange]);

  // Don't show button on own profile
  if (isOwnProfile) return null;

  // While status is loading for logged-in users, show a skeleton to prevent orange flash
  if (isFollowing === null && user) {
    return (
      <span className={`rounded-full animate-pulse bg-muted ${size === "sm" ? "h-7 w-20" : "h-9 w-24"} inline-block ${className}`} />
    );
  }

  // For logged-out users, always show "Follow" which will trigger auth gate
  const following = isFollowing ?? false;

  const sizeClasses = size === "sm"
    ? "px-4 py-1.5 text-xs"
    : "px-5 py-2 text-sm";

  // Visual states: not following → orange filled, following → outline, hover while following → red
  const showUnfollow = following && hovering && !loading;

  let buttonClasses;
  if (showUnfollow) {
    // Unfollow state — red border, red text
    buttonClasses = "border border-destructive text-destructive bg-transparent hover:bg-destructive/10";
  } else if (following) {
    // Following state — outline
    buttonClasses = "border border-input text-foreground bg-transparent hover:bg-muted";
  } else {
    // Not following — orange filled
    buttonClasses = "bg-primary hover:bg-primary/90 text-primary-foreground hover:shadow-[0_4px_20px_rgba(255,121,39,0.4)]";
  }

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      disabled={loading}
      className={`rounded-full font-medium transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer ${sizeClasses} ${buttonClasses} ${className}`}
    >
      {loading ? (
        <Loader2 className={`animate-spin mx-auto ${size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
      ) : showUnfollow ? (
        "Unfollow"
      ) : following ? (
        "Following"
      ) : (
        "Follow"
      )}
    </button>
  );
}
