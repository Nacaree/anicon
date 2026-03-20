"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuthGate } from "@/context/AuthGateContext";
import { isEventSaved, saveEvent, unsaveEvent } from "@/lib/savedEvents";


export default function EventsPageCard({ event }) {
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
      className={`bg-white rounded-xl overflow-hidden shrink-0 w-56 sm:w-60 shadow-sm hover:shadow-md
        transition-[box-shadow,opacity,translate] duration-300 ease-out relative group/card
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
    >
      {/* Clickable area — image + info */}
      {/* prefetch={true} pre-fetches the full RSC payload while the card is visible.
          Default Next.js prefetch only covers the loading boundary — prefetch=true
          caches the complete page so navigation is instant instead of ~400ms. */}
      <Link href={`/events/${event.id}`} prefetch={true} className="block">
        {/* Image — rounded-t-xl here ensures the image corners stay rounded during hover:scale
            transforms. Without this, parent overflow-hidden+border-radius can fail to clip
            transformed children on some GPU rendering paths, causing sharp corners. */}
        <div
          className="relative bg-gray-200 overflow-hidden rounded-t-xl h-32 sm:h-36"
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
          {/* Price line — relative+overflow-hidden contains the glint sweep animation.
              text-shadow on the <p> provides the glow for both icon and text.
              filter:drop-shadow intentionally omitted from the SVG — it creates a GPU compositing
              layer that breaks overflow-hidden+border-radius clipping during CSS transforms. */}
          <p className={`relative overflow-hidden text-sm font-semibold mt-2 mb-1 flex items-center gap-1 rounded-sm ${
            event.isFree
              ? "text-green-500 [text-shadow:0_0_10px_rgba(74,222,128,0.7)]"
              : "text-rose-500 [text-shadow:0_0_10px_rgba(251,113,133,0.7)]"
          }`}>
            {/* Glint sweep — z-10 so it passes over both icon and text */}
            <span className="price-glint absolute inset-0 w-1/2 bg-linear-to-r from-transparent via-white/30 to-transparent pointer-events-none z-10" />
            <svg className="w-3.5 h-3.5 shrink-0 relative" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a1 1 0 01-1 1 1 1 0 100 2 1 1 0 011 1v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a1 1 0 011-1 1 1 0 100-2 1 1 0 01-1-1V6z" />
            </svg>
            <span>{event.isFree ? "Free Entry" : `$${Number(event.ticketPrice).toFixed(2)}`}</span>
          </p>
          <p className="text-xs text-gray-400 mb-2">
            {formatCount(event.wantToGoCount || 0)} want to go
          </p>
        </div>
      </Link>

      {/* Actions — not part of the link. relative z-20 keeps the button above the
          press overlay so clicking it doesn't show the card-wide highlight. */}
      <div className="px-3 pb-3 relative z-20">
        <button
          onClick={handleWantToGo}
          className={`w-full text-xs font-medium py-2 px-3 rounded-full transition-colors duration-200 ${
            wantToGo
              ? "bg-green-500 text-white hover:bg-green-600 active:bg-green-700"
              : "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
          }`}
        >
          {wantToGo ? "Saved" : "Save Event"}
        </button>
      </div>

      {/* Press overlay — covers the entire card (including button area) but only
          activates when the Link is pressed. The button sits above it (z-20) so
          clicking Save doesn't trigger the highlight. */}
      <div className="absolute inset-0 bg-black/0 group-has-[a:active]/card:bg-black/8 transition-colors duration-150 pointer-events-none z-10" />
    </div>
  );
}
