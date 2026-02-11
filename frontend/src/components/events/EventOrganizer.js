"use client";

import { useState } from "react";
import { useAuthGate } from "@/context/AuthGateContext";

export default function EventOrganizer({ organizer }) {
  const { requireAuth } = useAuthGate();
  const [isFollowing, setIsFollowing] = useState(false);

  const handleFollow = () => {
    requireAuth(() => {
      setIsFollowing(!isFollowing);
    });
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-3">Event Organizer</h2>

      <div className="bg-gray-50 rounded-xl p-4 sm:p-5">
        {/* Organizer Info Row */}
        <div className="flex items-start gap-3 mb-3">
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

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-gray-900">
              {organizer.username}
            </h3>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] bg-[#FF7927] text-white px-2 py-0.5 rounded-full font-medium">
                {organizer.role}
              </span>
              <span className="text-xs text-gray-500">
                {organizer.followers} Followers
              </span>
            </div>
            <p className="text-xs text-gray-500 line-clamp-2">
              {organizer.bio}
            </p>
          </div>

          {/* Follow Button */}
          <button
            onClick={handleFollow}
            className={`text-sm font-medium px-4 py-1.5 rounded-full border transition-colors flex-shrink-0 ${
              isFollowing
                ? "bg-gray-100 text-gray-600 border-gray-300"
                : "bg-white text-[#FF7927] border-[#FF7927] hover:bg-orange-50"
            }`}
          >
            {isFollowing ? "Following" : "Follow"}
          </button>
        </div>

        {/* Reliability Note */}
        <div className="flex justify-center mb-3">
          <span className="text-[10px] bg-[#FF7927] text-white px-3 py-1 rounded-full">
            Stars or rating to tell their reliability
          </span>
        </div>

        {/* Visit Profile Link */}
        <div className="text-center">
          <button className="text-sm text-[#FF7927] hover:text-[#E66B1F] font-medium transition-colors">
            Visit Profile
          </button>
        </div>
      </div>
    </div>
  );
}
