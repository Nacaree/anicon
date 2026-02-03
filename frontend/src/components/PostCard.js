"use client";

import { useAuthGate } from "@/context/AuthGateContext";

export default function PostCard({ username, handle, text, imageUrl, avatarUrl }) {
  const { requireAuth } = useAuthGate();
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 mb-3 w-full max-w-full sm:max-w-2xl lg:max-w-3xl mx-auto">
      {/* User Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full overflow-hidden">
          <img
            src={avatarUrl}
            alt={`${username}'s avatar`}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="space-y-0.1">
          <h4 className="font-bold text-gray-900">{username}</h4>
          <p className="text-sm text-gray-500">@{handle}</p>
        </div>
      </div>

      {/* Text Box */}
      <div className="rounded-lg p-1 mb-2">
        <p className="text-gray-800">
          {text}
        </p>
      </div>

      {/* Image Box */}
      <div className="bg-gray-200 rounded-lg mb-3 overflow-hidden h-80 sm:h-96 lg:h-[32rem]">
        <img
          src={imageUrl}
          alt="Post content"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between gap-3">
        {/* Like Button - Left Side */}
        <button onClick={() => requireAuth(() => {})} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <svg
            className="w-6 h-6 text-gray-600"
            viewBox="0 -960 960 960"
            fill="currentColor"
          >
            {/* this section under here is the commands and coords that show the browser on how to draw a shape.*/}
            <path d="m480-121-41-37q-105.77-97.12-174.88-167.56Q195-396 154-451.5T96.5-552Q80-597 80-643q0-90.15 60.5-150.58Q201-854 290-854q57 0 105.5 27t84.5 78q42-54 89-79.5T670-854q89 0 149.5 60.42Q880-733.15 880-643q0 46-16.5 91T806-451.5Q765-396 695.88-325.56 626.77-255.12 521-158l-41 37Zm0-79q101.24-93 166.62-159.5Q712-426 750.5-476t54-89.14q15.5-39.13 15.5-77.72 0-66.14-42-108.64T670.22-794q-51.52 0-95.37 31.5T504-674h-49q-26-56-69.85-88-43.85-32-95.37-32Q224-794 182-751.5t-42 108.82q0 38.68 15.5 78.18 15.5 39.5 54 90T314-358q66 66 166 158Zm0-297Z"/>
          </svg>
        </button>

        {/* Right Side Buttons */}
        <div className="flex gap-3">
          {/* Send/Share Button */}
          <button onClick={() => requireAuth(() => {})} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg
              className="w-6 h-6 text-gray-600"
              viewBox="0 -960 960 960"
              fill="currentColor"
            >
              <path d="M686-80q-47.5 0-80.75-33.25T572-194q0-8 5-34L278-403q-16.28 17.34-37.64 27.17Q219-366 194-366q-47.5 0-80.75-33.25T80-480q0-47.5 33.25-80.75T194-594q24 0 45 9.3 21 9.29 37 25.7l301-173q-2-8-3.5-16.5T572-766q0-47.5 33.25-80.75T686-880q47.5 0 80.75 33.25T800-766q0 47.5-33.25 80.75T686-652q-23.27 0-43.64-9Q622-670 606-685L302-516q3 8 4.5 17.5t1.5 18q0 8.5-1 16t-3 15.5l303 173q16-15 36.09-23.5 20.1-8.5 43.07-8.5Q734-308 767-274.75T800-194q0 47.5-33.25 80.75T686-80Zm.04-60q22.96 0 38.46-15.54 15.5-15.53 15.5-38.5 0-22.96-15.54-38.46-15.53-15.5-38.5-15.5-22.96 0-38.46 15.54-15.5 15.53-15.5 38.5 0 22.96 15.54 38.46 15.53 15.5 38.5 15.5Zm-492-286q22.96 0 38.46-15.54 15.5-15.53 15.5-38.5 0-22.96-15.54-38.46-15.53-15.5-38.5-15.5-22.96 0-38.46 15.54-15.5 15.53-15.5 38.5 0 22.96 15.54 38.46 15.53 15.5 38.5 15.5Zm492-286q22.96 0 38.46-15.54 15.5-15.53 15.5-38.5 0-22.96-15.54-38.46-15.53-15.5-38.5-15.5-22.96 0-38.46 15.54-15.5 15.53-15.5 38.5 0 22.96 15.54 38.46 15.53 15.5 38.5 15.5ZM686-194ZM194-480Zm492-286Z"/>
            </svg>
          </button>

          {/* Bookmark Button */}
          <button onClick={() => requireAuth(() => {})} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg
              className="w-6 h-6 text-gray-600"
              viewBox="0 -960 960 960"
              fill="currentColor"
            >
              <path d="M200-120v-665q0-24 18-42t42-18h440q24 0 42 18t18 42v665L480-240 200-120Zm60-91 220-93 220 93v-574H260v574Zm0-574h440-440Z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
