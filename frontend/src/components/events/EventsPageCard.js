"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuthGate } from "@/context/AuthGateContext";

export default function EventsPageCard({
  event,
  isEnlarged = false,
  isHoverEnlargeable = false,
}) {
  const { requireAuth } = useAuthGate();
  const [wantToGo, setWantToGo] = useState(false);
  const [goingCount, setGoingCount] = useState(event.wantToGoCount || 0);

  const handleWantToGo = () => {
    requireAuth(() => {
      setWantToGo(!wantToGo);
      setGoingCount((prev) => (wantToGo ? prev - 1 : prev + 1));
    });
  };

  const handleShare = async () => {
    const shareData = {
      title: event.title,
      text: `Check out ${event.title} on AniCon!`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled or share failed silently
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
    }
  };

  const formatCount = (count) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  return (
    <div
      className={`bg-white rounded-xl overflow-hidden shrink-0 shadow-sm border border-gray-100 transition-all duration-500 ease-in-out ${
        isEnlarged
          ? "w-72 sm:w-85 shadow-md hover:shadow-lg"
          : "w-56 sm:w-60 hover:shadow-md"
      } ${isHoverEnlargeable ? "hover:scale-[1.06] hover:z-10 hover:shadow-lg" : ""}`}
    >
      {/* Clickable area — image + info */}
      <Link href={`/events/${event.id}`}>
        {/* Image */}
        <div
          className={`relative bg-gray-200 overflow-hidden transition-all duration-500 ease-in-out ${
            isEnlarged ? "h-44 sm:h-45" : "h-32 sm:h-36"
          }`}
        >
          {event.imageUrl ? (
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3 pb-0">
          <p className="text-xs text-[#FF7927] font-semibold mb-1">
            {event.date}, {event.time}
          </p>
          <h3 className="font-bold text-sm text-gray-900 mb-1 line-clamp-1">
            {event.title}
          </h3>
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <svg className="w-3 h-3 text-[#FF7927] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <span className="line-clamp-1">{event.location}</span>
          </p>
          <p className="text-xs text-gray-400 mb-2">
            {formatCount(goingCount)} want to go
          </p>
        </div>
      </Link>

      {/* Actions — not part of the link */}
      <div className="flex items-center gap-2 px-3 pb-3">
        <button
          onClick={handleWantToGo}
          className={`flex-1 text-xs font-medium py-1.5 px-3 rounded-full transition-colors duration-200 ${
            wantToGo
              ? "bg-green-500 text-white hover:bg-green-600"
              : "bg-[#FF7927] text-white hover:bg-[#E66B1F]"
          }`}
        >
          {wantToGo ? "Going" : "Want to go"}
        </button>
        <button
          onClick={handleShare}
          className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          aria-label="Share event"
        >
          <svg className="w-3.5 h-3.5 text-[#FF7927]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </button>
      </div>
    </div>
  );
}
