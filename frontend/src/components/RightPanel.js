"use client";

import { useState, useEffect, useRef } from "react";
import { profileApi, trendingApi } from "@/lib/api";
import { RoleBadge } from "@/components/profile/RoleBadge";
import { FollowButton } from "@/components/FollowButton";
import Link from "next/link";

// Featured creator username shown in the right panel card
const FEATURED_CREATOR = "PichGamer89";

// Reusable pulse skeleton block
function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

function AnimatedCard({ children, className = "" }) {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.2 }
    );

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      className={`transition-all duration-400 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      } ${className}`}
    >
      {children}
    </div>
  );
}

// Skeleton for the featured creator card
function CreatorCardSkeleton() {
  return (
    <div className="bg-white rounded-xl px-6 pt-0 pb-6 border border-gray-200">
      <div className="relative">
        <Skeleton className="rounded-t-xl h-25 -mx-6 mb-3" />
        <Skeleton className="w-24 h-24 rounded-full absolute -bottom-11 -left-1 border-4 border-white" />
      </div>
      <div className="pt-10 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-40" />
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-10 w-full rounded-full mt-2" />
      </div>
    </div>
  );
}

// Skeleton for the trending section
function TrendingSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <Skeleton className="h-5 w-28 mb-4" />
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={i < 3 ? "border-b border-gray-100 pb-3" : "pb-1"}>
            <Skeleton className="h-4 w-28 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Skeleton for the recommended users section
function UsersSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <Skeleton className="h-5 w-36 mb-4" />
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1 min-w-0 space-y-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RightPanel() {
  const [creator, setCreator] = useState(null);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [trending, setTrending] = useState([]);

  // Loading states for per-section skeleton feedback
  const [creatorLoading, setCreatorLoading] = useState(true);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);

  // Fetch the featured creator's profile, suggested users, and trending hashtags on mount
  useEffect(() => {
    profileApi.getProfileByUsername(FEATURED_CREATOR)
      .then(setCreator)
      .catch((err) => console.error("Failed to load featured creator:", err))
      .finally(() => setCreatorLoading(false));

    profileApi.getSuggestedUsers(3)
      .then(setSuggestedUsers)
      .catch((err) => console.error("Failed to load suggested users:", err))
      .finally(() => setUsersLoading(false));

    trendingApi.getTrending(4)
      .then(setTrending)
      .catch((err) => console.error("Failed to load trending:", err))
      .finally(() => setTrendingLoading(false));
  }, []);

  return (
    <aside className="w-80 space-y-6 sticky top-20 self-start max-h-[calc(100vh-5rem)] overflow-y-auto">
      {/* Creator Profile Card */}
      {creatorLoading ? (
        <AnimatedCard><CreatorCardSkeleton /></AnimatedCard>
      ) : creator && (
        <AnimatedCard>
          <div className="bg-white rounded-xl px-6 pt-0 pb-6 text-gray-900 border border-gray-200">
            <div className="relative">
              {/* Banner */}
              <div className="bg-linear-to-br from-[#FF7927] to-[#E66B1F] rounded-t-xl h-25 mb-3 -mx-6 overflow-hidden relative">
                {creator.bannerImageUrl && (
                  <>
                    <img
                      src={creator.bannerImageUrl}
                      alt=""
                      className="w-full h-full object-cover absolute inset-0"
                      style={{ objectPosition: `center ${creator.bannerPositionY ?? 50}%` }}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-linear-to-r from-black/60 via-black/40 to-transparent"></div>
                  </>
                )}
              </div>

              {/* Profile picture overlapping banner — links to profile */}
              <Link href={`/profiles/${creator.username}`} className="absolute bottom-[-45] left-[-3] w-24 h-24 rounded-full shadow-md overflow-hidden block hover:brightness-75 transition-all">
                {creator.avatarUrl ? (
                  <img
                    src={creator.avatarUrl}
                    alt={creator.displayName || creator.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-2xl font-bold">
                    {(creator.displayName || creator.username)?.[0]?.toUpperCase()}
                  </div>
                )}
              </Link>
            </div>

            {/* Creator Info Section */}
            <div className="pt-10">
              {/* Name with role badges — name links to profile */}
              <div className="flex items-center gap-2 flex-wrap">
                <Link href={`/profiles/${creator.username}`} className="font-bold text-lg hover:text-[#FF7927] transition-colors duration-300">
                  {creator.displayName || creator.username}
                </Link>
                <RoleBadge roles={creator.roles} size="sm" />
              </div>

              {/* Username handle — also links to profile */}
              <Link href={`/profiles/${creator.username}`} className="text-sm text-gray-500 hover:text-[#FF7927] transition-colors duration-300 mb-2 block">
                @{creator.username}
              </Link>

              {/* Bio */}
              {creator.bio && (
                <p className="text-sm text-gray-600 mb-4">{creator.bio}</p>
              )}

              {/* Followers count with icon */}
              <div className="flex items-center gap-2 text-sm text-gray-700 mb-4">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                </svg>
                <span>{formatFollowers(creator.followerCount)} Followers</span>
              </div>

              {/* Follow button — wired to the real follow API */}
              <FollowButton userId={creator.id} className="w-full" />
            </div>
          </div>
        </AnimatedCard>
      )}

      {/* Trending Now — real hashtags from posts in the last 7 days */}
      {trendingLoading ? (
        <AnimatedCard><TrendingSkeleton /></AnimatedCard>
      ) : trending.length > 0 && (
        <AnimatedCard>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-bold text-gray-800 mb-4">Trending now</h3>
            <div className="space-y-1">
              {trending.map((tag, i) => (
                <Link
                  key={tag.hashtag}
                  href={`/search?q=${encodeURIComponent("#" + tag.hashtag)}&tab=posts`}
                  className={`block pb-3 hover:opacity-75 transition-opacity ${
                    i < trending.length - 1 ? "border-b border-gray-100" : ""
                  }`}
                >
                  <p className="text-orange-500 font-medium text-sm">#{tag.hashtag}</p>
                  <p className="text-xs text-gray-500">
                    {tag.postCount} {tag.postCount === 1 ? "Post" : "Posts"}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </AnimatedCard>
      )}

      {/* Recommended Users — real users from the platform, ordered by followers */}
      {usersLoading ? (
        <AnimatedCard><UsersSkeleton /></AnimatedCard>
      ) : suggestedUsers.length > 0 && (
        <AnimatedCard>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-bold text-gray-800 mb-4">Recommended users</h3>
            <div className="space-y-4">
              {suggestedUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3">
                  <Link href={`/profiles/${user.username}`} className="w-10 h-10 rounded-full shrink-0 overflow-hidden hover:brightness-75 transition-all">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.displayName || user.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-sm font-bold">
                        {(user.displayName || user.username)?.[0]?.toUpperCase()}
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/profiles/${user.username}`} className="font-medium text-sm text-gray-800 hover:text-[#FF7927] transition-colors truncate block">
                      {user.displayName || user.username}
                    </Link>
                    <p className="text-xs text-gray-500 truncate">@{user.username}</p>
                  </div>
                  <FollowButton userId={user.id} size="sm" />
                </div>
              ))}
            </div>
          </div>
        </AnimatedCard>
      )}

      {/* Footer / Copyright */}
      <AnimatedCard>
        <div className="space-y-2 pb-8">
          <div className="flex justify-center gap-4 text-gray-400 text-xs">
            <p>© 2025 AniCon. All rights reserved.</p>
          </div>
          <div className="flex justify-center gap-3 text-gray-400 text-xs">
            <a href="/privacy" className="hover:text-[#FF7927] transition-colors">
              Privacy
            </a>
            <span>•</span>
            <a href="/terms" className="hover:text-[#FF7927] transition-colors">
              Terms
            </a>
          </div>
        </div>
      </AnimatedCard>
    </aside>
  );
}

// Format follower count (e.g. 4600 → "4.6K")
function formatFollowers(count) {
  if (!count) return "0";
  if (count >= 1000) return (count / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return count.toString();
}
