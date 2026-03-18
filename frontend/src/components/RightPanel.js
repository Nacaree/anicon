"use client";

import { useState, useEffect, useRef } from "react";
import { profileApi } from "@/lib/api";
import { RoleBadge } from "@/components/profile/RoleBadge";
import { FollowButton } from "@/components/FollowButton";
import Link from "next/link";

// Featured creator username shown in the right panel card
const FEATURED_CREATOR = "PichGamer89";

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

export default function RightPanel() {
  const [creator, setCreator] = useState(null);

  // Fetch the featured creator's profile on mount
  useEffect(() => {
    profileApi.getProfileByUsername(FEATURED_CREATOR)
      .then(setCreator)
      .catch((err) => console.error("Failed to load featured creator:", err));
  }, []);

  return (
    <aside className="w-80 space-y-6 sticky top-20 self-start max-h-[calc(100vh-5rem)] overflow-y-auto">
      {/* Creator Profile Card */}
      {creator && (
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

              {/* Profile picture overlapping banner */}
              <div className="absolute bottom-[-45] left-[-3] w-24 h-24 rounded-full shadow-md overflow-hidden">
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
              </div>
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

      {/* Trending Now */}
      <AnimatedCard>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-bold text-gray-800 mb-4">Trending now</h3>
          <div className="space-y-1">
            {/* Trending Item */}
            <div className="border-b border-gray-100 pb-3">
              <p className="text-orange-500 font-medium text-sm">#chainssawman</p>
              <p className="text-xs text-gray-500">532 Posts</p>
            </div>

            <div className="border-b border-gray-100 pb-3">
              <p className="text-orange-500 font-medium text-sm">#OneCosplays</p>
              <p className="text-xs text-gray-500">645 Posts</p>
            </div>

            <div className="border-b border-gray-100 pb-3">
              <p className="text-orange-500 font-medium text-sm">
                #demonslayercosmode
              </p>
              <p className="text-xs text-gray-500">737 Posts</p>
            </div>

            <div className="pb-3">
              <p className="text-orange-500 font-medium text-sm">#onePie3d3</p>
              <p className="text-xs text-gray-500">467 Posts</p>
            </div>
          </div>
        </div>
      </AnimatedCard>

      {/* Footer / Copyright */}
      <AnimatedCard>
        <div className="space-y-2 pb-8">
          <div className="flex justify-center gap-4 text-gray-400 text-xs">
            <p>© 2025 AniCon. All rights reserved.</p>
          </div>
          <div className="flex justify-center gap-3 text-gray-400 text-xs">
            <a href="#" className="hover:text-[#FF7927] transition-colors">
              Privacy
            </a>
            <span>•</span>
            <a href="#" className="hover:text-[#FF7927] transition-colors">
              Terms
            </a>
            <span>•</span>
            <a href="#" className="hover:text-[#FF7927] transition-colors">
              About
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
