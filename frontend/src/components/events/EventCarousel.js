"use client";

import { useState, useEffect, useRef, Children } from "react";

// Native-scroll carousel with hover-scale cards and show-on-hover arrows.
// Uses browser-native overflow-x scroll (GPU compositor thread) for the smoothest
// possible scroll physics — drag, trackpad, and wheel all handled natively.
// Arrow clicks use scrollBy({ behavior: "smooth" }) with a targetScrollRef to
// handle rapid clicks without reading stale scrollLeft mid-animation.
export default function EventCarousel({
  children,
  // autoPlay: advances the carousel automatically on an interval, pauses on hover
  autoPlay = false,
  autoPlayInterval = 4000,
}) {
  const scrollRef = useRef(null);
  // Tracks the intended scroll position so rapid arrow clicks accumulate correctly
  // without reading scrollLeft mid-animation (which causes jerkiness).
  const targetScrollRef = useRef(0);
  const [showButtons, setShowButtons] = useState(false);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  // How far each arrow click scrolls (roughly 2 cards + gaps).
  const SCROLL_AMOUNT = 500;

  // Sync boundary state (hide arrows at start/end of scroll range).
  const updateBoundaries = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollPrev(el.scrollLeft > 1);
    // 1px tolerance for sub-pixel rounding at the end.
    setCanScrollNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  };

  // Initial boundary check + re-check when children change (content remount).
  useEffect(() => {
    // Small delay so the DOM has rendered the new children before measuring.
    const id = requestAnimationFrame(updateBoundaries);
    return () => cancelAnimationFrame(id);
  }, [children]);

  // Sync targetScrollRef after any scroll settles (manual drag, trackpad, wheel).
  // scrollend fires once when scroll animation completes — no debounce needed.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScrollEnd = () => {
      targetScrollRef.current = el.scrollLeft;
      updateBoundaries();
    };

    // Also update boundaries during scroll for responsive arrow visibility.
    const onScroll = () => updateBoundaries();

    el.addEventListener("scrollend", onScrollEnd);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scrollend", onScrollEnd);
      el.removeEventListener("scroll", onScroll);
    };
  }, []);

  const scroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;

    const delta = direction === "left" ? -SCROLL_AMOUNT : SCROLL_AMOUNT;
    const maxScroll = el.scrollWidth - el.clientWidth;

    // Accumulate onto target and clamp to valid range.
    targetScrollRef.current = Math.max(
      0,
      Math.min(targetScrollRef.current + delta, maxScroll),
    );

    el.scrollTo({
      left: targetScrollRef.current,
      behavior: "smooth",
    });
  };

  // Auto-play: scroll right every interval, loop back at start when at end.
  // Pauses on hover (showButtons === true means mouse is over the carousel).
  useEffect(() => {
    if (!autoPlay || showButtons) return;
    const el = scrollRef.current;
    if (!el) return;

    const id = setInterval(() => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (el.scrollLeft >= maxScroll - 1) {
        // At the end — loop back to start.
        targetScrollRef.current = 0;
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        scroll("right");
      }
    }, autoPlayInterval);

    return () => clearInterval(id);
  }, [autoPlay, autoPlayInterval, showButtons]);

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowButtons(true)}
      onMouseLeave={() => setShowButtons(false)}
    >
      {/* Scroll container — native overflow for GPU-accelerated scroll physics.
          py-4 gives vertical breathing room so hover:scale doesn't get clipped. */}
      <div
        ref={scrollRef}
        className="overflow-x-auto flex gap-4 sm:gap-7 py-4 px-4"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {Children.map(children, (child, index) => (
          <div
            key={index}
            className="shrink-0"
          >
            {/* Inner wrapper owns the hover scale so it doesn't interfere with
                the scroll container's layout or the card's own shadow/opacity transitions.
                transformOrigin center-bottom so cards scale upward from their base. */}
            <div
              className="hover:scale-[1.05] hover:z-10 transition-transform duration-300 ease-out"
              style={{ transformOrigin: "center bottom" }}
            >
              {child}
            </div>
          </div>
        ))}
      </div>

      {/* Left navigation button — fades in on hover, hidden at scroll start */}
      <button
        onClick={() => scroll("left")}
        className={`absolute left-1 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg hidden sm:flex items-center justify-center transition-opacity duration-300 hover:bg-gray-50 -ml-5 ${
          showButtons && canScrollPrev
            ? "opacity-100"
            : "opacity-0 pointer-events-none"
        }`}
        aria-label="Scroll left"
      >
        <svg
          className="w-5 h-5 text-orange-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      {/* Right navigation button — fades in on hover, hidden at scroll end */}
      <button
        onClick={() => scroll("right")}
        className={`absolute right-1 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg hidden sm:flex items-center justify-center transition-opacity duration-300 hover:bg-gray-50 -mr-5 ${
          showButtons && canScrollNext
            ? "opacity-100"
            : "opacity-0 pointer-events-none"
        }`}
        aria-label="Scroll right"
      >
        <svg
          className="w-5 h-5 text-orange-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </div>
  );
}
