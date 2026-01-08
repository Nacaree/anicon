"use client";

import { useRef, useState, useEffect } from "react";

export default function EventCarousel({ children, hideGradients = false }) {
  const scrollContainerRef = useRef(null);
  const [showButtons, setShowButtons] = useState(false);
  const [showLeftGradient, setShowLeftGradient] = useState(false);
  const [showRightGradient, setShowRightGradient] = useState(false);

  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;

    // const scrollLeft = container.scrollLeft;
    // const scrollWidth = container.scrollWidth;
    // const clientWidth = container.clientWidth;
    // const maxScroll = scrollWidth - clientWidth;

    // Show left gradient if scrolled more than halfway through the first card (160px = half of 320px card width)
    // setShowLeftGradient(scrollLeft > 160);

    // // Show right gradient if not scrolled to the end (with 160px threshold)
    // setShowRightGradient(scrollLeft < maxScroll - 160);

    setShowLeftGradient(scrollLeft > 5);
    setShowRightGradient(scrollLeft < scrollWidth - clientWidth - 5);
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Check initial state
    checkScroll();

    // Add scroll listener
    container.addEventListener("scroll", checkScroll);

    return () => {
      container.removeEventListener("scroll", checkScroll);
    };
  }, []);

  const scroll = (direction) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = container.offsetWidth * 0.8; // Scroll 80% of container width
    const newScrollPosition =
      direction === "left"
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: newScrollPosition,
      behavior: "smooth",
    });
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowButtons(true)}
      onMouseLeave={() => setShowButtons(false)}
    >
      {/* 2. Wrap gradients in conditional check */}
      {!hideGradients && (
        <>
          {/* Mask gradient on left edge */}
          <div
            className={`absolute left-0 top-0 bottom-0 w-20 z-[5] pointer-events-none transition-opacity duration-300 ${
              showLeftGradient ? "opacity-100" : "opacity-0"
            }`}
            style={{
              background:
                "linear-gradient(to right, rgba(249, 250, 251, 0.85) 0%, transparent 100%)",
            }}
          ></div>

          {/* Mask gradient on right edge */}
          <div
            className={`absolute right-0 top-0 bottom-0 w-20 z-[5] pointer-events-none transition-opacity duration-300 ${
              showRightGradient ? "opacity-100" : "opacity-0"
            }`}
            style={{
              background:
                "linear-gradient(to left, rgba(249, 250, 251, 0.85) 0%, transparent 100%)",
            }}
          ></div>
        </>
      )}

      {/* Carousel Container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-5 overflow-x-auto scrollbar-hide scroll-smooth rounded-xl p-4 z-0"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {children}
      </div>

      {/* Left Navigation Button */}
      <button
        onClick={() => scroll("left")}
        className={`absolute left-1 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center transition-opacity duration-300 hover:bg-gray-50 -ml-5 ${
          showButtons ? "opacity-100" : "opacity-0"
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

      {/* Right Navigation Button */}
      <button
        onClick={() => scroll("right")}
        className={`absolute right-1 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center transition-opacity duration-300 hover:bg-gray-50 -mr-5 ${
          showButtons ? "opacity-100" : "opacity-0"
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
