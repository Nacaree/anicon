"use client";

import { useState, useEffect, useRef } from "react";

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
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-gray-200" />
            <div className="flex-1">
              <div className="h-4 w-24 bg-gray-200 rounded mb-1" />
              <div className="h-3 w-20 bg-gray-200 rounded" />
            </div>
          </div>
          <div className="h-3 w-40 bg-gray-200 rounded mb-2" />
          <div className="h-5 w-24 bg-gray-200 rounded-full mb-2" />
          <div className="h-3 w-full bg-gray-200 rounded mb-1" />
          <div className="h-3 w-3/4 bg-gray-200 rounded mb-3" />
          <div className="border-t border-gray-100 pt-3 flex justify-center">
            <div className="h-4 w-20 bg-gray-200 rounded" />
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
        {/* Top Row: Avatar + Name */}
        <div className="flex items-center gap-3 mb-2">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-orange-300 flex-shrink-0 overflow-hidden">
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

          {/* Name + Handle */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-gray-900">
              {organizer.username}
            </h3>
            <p className="text-xs text-gray-500">@{organizer.username}</p>
          </div>
        </div>

        {/* Followers / Following */}
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
          <span>
            <span className="font-semibold text-gray-900">{organizer.followers}</span> followers
          </span>
          <span>
            <span className="font-semibold text-gray-900">{organizer.following || 0}</span> following
          </span>
        </div>

        {/* Badge / Rank */}
        <div className="mb-2">
          <span className="text-[10px] bg-[#FF7927] text-white px-2.5 py-0.5 rounded-full font-medium">
            {organizer.role}
          </span>
        </div>

        {/* Bio */}
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">
          {organizer.bio}
        </p>

        {/* Visit Profile Link */}
        <div className="text-center pt-3 border-t border-gray-100">
          <button className="group text-sm text-[#FF7927] font-medium transition-all duration-300 hover:tracking-wider">
            Visit Profile
            <span className="block h-0.5 bg-[#FF7927] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center mt-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
