"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuthGate } from "@/context/AuthGateContext";
import { isEventSaved, saveEvent, unsaveEvent } from "@/lib/savedEvents";

export default function EventsPageCard({
  event,
  isEnlarged = false,
  isHoverEnlargeable = false,
}) {
  const { requireAuth } = useAuthGate();
  // Initialize from localStorage so the saved state survives page refreshes.
  // Runs after mount (client-only) to avoid SSR mismatch.
  const [wantToGo, setWantToGo] = useState(false);
  useEffect(() => {
    setWantToGo(isEventSaved(event.id));
  }, [event.id]);

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
      if (wantToGo) {
        unsaveEvent(event.id);
      } else {
        saveEvent(event.id);
      }
      setWantToGo(!wantToGo);
    });
  };

  const formatCount = (count) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  return (
    <div
      ref={cardRef}
      className={`bg-white rounded-xl overflow-hidden shrink-0 shadow-sm transition-all duration-400 ease-out active:brightness-90 active:scale-95
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
        ${isEnlarged ? "w-72 sm:w-85 shadow-md hover:shadow-lg" : "w-56 sm:w-60 hover:shadow-md"}
        ${isHoverEnlargeable ? "hover:scale-[1.06] hover:z-10 hover:shadow-lg" : ""}`}
    >
      {/* Clickable area — image + info */}
      {/* prefetch={true} pre-fetches the full RSC payload while the card is visible.
          Default Next.js prefetch only covers the loading boundary — prefetch=true
          caches the complete page so navigation is instant instead of ~400ms. */}
      <Link href={`/events/${event.id}`} prefetch={true} className="block">
        {/* Image */}
        <div
          className={`relative bg-gray-200 overflow-hidden transition-all duration-500 ease-in-out ${
            isEnlarged ? "h-37 sm:h-39" : "h-32 sm:h-36"
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
            {event.date} • {event.time}
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
          {/* Price line — green for free, rose for paid (distinct from the orange date text above).
              mt-2 adds breathing room between location and price so it reads as a distinct section. */}
          {/* Price line — relative+overflow-hidden contains the glint sweep.
              text-shadow glow + animated diagonal glint mirror the promoted events card aesthetic. */}
          {/* Price line — relative+overflow-hidden contains the glint sweep.
              text-shadow glow on text + drop-shadow filter on icon + animated diagonal glint. */}
          <p className={`relative overflow-hidden text-sm font-semibold mt-2 mb-1 flex items-center gap-1 rounded-sm ${
            event.isFree
              ? "text-green-500 [text-shadow:0_0_10px_rgba(74,222,128,0.7)]"
              : "text-rose-500 [text-shadow:0_0_10px_rgba(251,113,133,0.7)]"
          }`}>
            {/* Glint sweep — z-10 so it passes over both icon and text */}
            <span className="price-glint absolute inset-0 w-1/2 bg-linear-to-r from-transparent via-white/30 to-transparent pointer-events-none z-10" />
            {/* drop-shadow gives the icon the same glow as the text-shadow on the label */}
            <svg className={`w-3.5 h-3.5 shrink-0 relative ${
              event.isFree
                ? "filter-[drop-shadow(0_0_4px_rgba(74,222,128,0.8))]"
                : "filter-[drop-shadow(0_0_4px_rgba(251,113,133,0.8))]"
            }`} fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a1 1 0 01-1 1 1 1 0 100 2 1 1 0 011 1v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a1 1 0 011-1 1 1 0 100-2 1 1 0 01-1-1V6z" />
            </svg>
            <span>{event.isFree ? "Free Entry" : `$${Number(event.ticketPrice).toFixed(2)}`}</span>
          </p>
          <p className="text-xs text-gray-400 mb-2">
            {formatCount(event.wantToGoCount || 0)} want to go
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
          {wantToGo ? "Saved" : "Save Event"}
        </button>
      </div>
    </div>
  );
}
