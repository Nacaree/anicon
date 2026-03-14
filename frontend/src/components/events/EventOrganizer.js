"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { RoleBadge } from "@/components/profile/RoleBadge";

export default function EventOrganizer({ organizer, loading = false }) {
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

  if (loading) {
    return (
      <div>
        <div className="h-5 w-36 bg-gray-200 rounded animate-pulse mb-3" />
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-200" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-5 w-28 bg-gray-200 rounded" />
                <div className="h-5 w-16 bg-gray-200 rounded-full" />
              </div>
              <div className="h-4 w-24 bg-gray-200 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4 px-1">
            <div className="flex-1 flex flex-col items-center gap-1">
              <div className="h-5 w-10 bg-gray-200 rounded" />
              <div className="h-3 w-16 bg-gray-200 rounded" />
            </div>
            <div className="w-px h-7 bg-gray-200" />
            <div className="flex-1 flex flex-col items-center gap-1">
              <div className="h-5 w-10 bg-gray-200 rounded" />
              <div className="h-3 w-16 bg-gray-200 rounded" />
            </div>
          </div>
          <div className="border-t border-gray-100 pt-3 mt-4 flex justify-center">
            <div className="h-4 w-24 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className={`transition-all duration-700 ease-out ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-6"
      }`}
    >
      <h2 className="text-lg font-bold text-gray-900 mb-3">Event Organizer</h2>

      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-orange-300 shrink-0 overflow-hidden ring-2 ring-orange-100">
            {organizer.avatarUrl ? (
              <img
                src={organizer.avatarUrl}
                alt={organizer.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-orange-300" />
            )}
          </div>

          {/* Name + Role */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-[16px] text-gray-900 truncate">
                {organizer.displayName}
              </h3>
              <RoleBadge roles={organizer.roles} size="sm" />
            </div>
            <p className="text-sm text-gray-400">@{organizer.username}</p>
          </div>
        </div>

        {/* Follower Stats */}
        <div className="flex items-center gap-4 mt-4 px-1">
          <div className="text-center flex-1">
            <span className="text-base font-bold text-gray-900 block">{organizer.followers}</span>
            <span className="text-xs text-gray-400 uppercase tracking-wider">Followers</span>
          </div>
          <div className="w-px h-7 bg-gray-200" />
          <div className="text-center flex-1">
            <span className="text-base font-bold text-gray-900 block">{organizer.following || 0}</span>
            <span className="text-xs text-gray-400 uppercase tracking-wider">Following</span>
          </div>
        </div>

        {/* Visit Profile Link */}
        <div className="text-center pt-3 mt-4 border-t border-gray-100">
          <Link href={`/profiles/${organizer.username}`} className="group inline-block text-sm text-[#FF7927] font-medium transition-all duration-300 hover:tracking-wider active:scale-95 active:text-[#cc6020]">
            Visit Profile
            <span className="block h-0.5 bg-[#FF7927] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center mt-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
