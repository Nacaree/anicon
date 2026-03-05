"use client";

import { useState, useEffect, useRef } from "react";
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

  // Scroll reveal — card starts invisible and slides up when it enters the viewport.
  // disconnect() after first trigger so the animation only plays once per card.
  const cardRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { threshold: 0.1, rootMargin: "0px 0px -20px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleWantToGo = () => {
    requireAuth(() => {
      setWantToGo(!wantToGo);
      setGoingCount((prev) => (wantToGo ? prev - 1 : prev + 1));
    });
  };

  const formatCount = (count) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  return (
    <div
      ref={cardRef}
      className={`bg-white rounded-xl overflow-hidden shrink-0 shadow-sm transition-all duration-500 ease-in-out active:brightness-90 active:scale-95
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
        ${isEnlarged ? "w-72 sm:w-85 shadow-md hover:shadow-lg" : "w-56 sm:w-60 hover:shadow-md"}
        ${isHoverEnlargeable ? "hover:scale-[1.06] hover:z-10 hover:shadow-lg" : ""}`}
    >
      {/* Clickable area — image + info */}
      <Link href={`/events/${event.id}`} className="block">
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
              loading="lazy"
              style={{ opacity: 0, transition: "opacity 0.5s ease" }}
              onLoad={(e) => { e.currentTarget.style.opacity = "1"; }}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
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
            <svg
              className="w-3 h-3 text-[#FF7927] flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="line-clamp-1">{event.location}</span>
          </p>
          <p className="text-xs text-gray-400 mb-2">
            {formatCount(goingCount)} want to go
          </p>
        </div>
      </Link>

      {/* Actions — not part of the link */}
      <div className="px-3 pb-3">
        <button
          onClick={handleWantToGo}
          className={`w-full text-xs font-medium py-2 px-3 rounded-full transition-colors duration-200 ${
            wantToGo
              ? "bg-green-500 text-white hover:bg-green-600"
              : "bg-[#FF7927] text-white hover:bg-[#E66B1F]"
          }`}
        >
          {wantToGo ? "Going" : "Save Event"}
        </button>
      </div>
    </div>
  );
}
