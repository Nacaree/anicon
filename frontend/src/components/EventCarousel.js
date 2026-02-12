"use client";

import {
  useRef,
  useState,
  useEffect,
  Children,
  cloneElement,
  isValidElement,
} from "react";

export default function EventCarousel({
  children,
  hideGradients = false,
  enableEnlarge = false,
}) {
  const scrollContainerRef = useRef(null);
  const [showButtons, setShowButtons] = useState(false);
  const [showLeftGradient, setShowLeftGradient] = useState(false);
  const [showRightGradient, setShowRightGradient] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [firstVisibleIndex, setFirstVisibleIndex] = useState(0);

  const itemRefs = useRef([]);
  const visibleIndicesRef = useRef(new Set());

  const childCount = Children.count(children);

  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;

    setShowLeftGradient(scrollLeft > 5);
    setShowRightGradient(scrollLeft < scrollWidth - clientWidth - 5);
  };

  useEffect(() => {
    setIsMounted(true);
    const container = scrollContainerRef.current;
    if (!container) return;

    checkScroll();

    container.addEventListener("scroll", checkScroll);

    return () => {
      container.removeEventListener("scroll", checkScroll);
    };
  }, []);

  // IntersectionObserver for tracking first visible card
  useEffect(() => {
    if (!enableEnlarge) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Number(entry.target.dataset.carouselIndex);
          if (entry.isIntersecting) {
            visibleIndicesRef.current.add(index);
          } else {
            visibleIndicesRef.current.delete(index);
          }
        });

        if (visibleIndicesRef.current.size > 0) {
          const minIndex = Math.min(...visibleIndicesRef.current);
          setFirstVisibleIndex((prev) =>
            prev === minIndex ? prev : minIndex
          );
        }
      },
      {
        root: container,
        threshold: 0.5,
      }
    );

    itemRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
      visibleIndicesRef.current.clear();
    };
  }, [enableEnlarge, childCount]);

  // Reset when children change (e.g. EventTimeline filtering)
  const prevChildCount = useRef(childCount);
  useEffect(() => {
    if (prevChildCount.current !== childCount) {
      setFirstVisibleIndex(0);
      visibleIndicesRef.current.clear();
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ left: 0 });
      }
      prevChildCount.current = childCount;
    }
  }, [childCount]);

  const scroll = (direction) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = container.offsetWidth * 0.8;
    const newScrollPosition =
      direction === "left"
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: newScrollPosition,
      behavior: "smooth",
    });
  };

  const renderChildren = () => {
    if (!enableEnlarge) return children;

    return Children.map(children, (child, index) => (
      <div
        key={index}
        ref={(el) => (itemRefs.current[index] = el)}
        data-carousel-index={index}
        className="shrink-0"
      >
        {isValidElement(child)
          ? cloneElement(child, {
              isEnlarged: index === firstVisibleIndex,
              isHoverEnlargeable: index !== firstVisibleIndex,
            })
          : child}
      </div>
    ));
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowButtons(true)}
      onMouseLeave={() => setShowButtons(false)}
    >
      {!hideGradients && isMounted && (
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
        className={`flex gap-5 overflow-x-auto scrollbar-hide scroll-smooth rounded-xl z-0 ${
          enableEnlarge ? "items-center p-4 pt-6" : "p-4"
        }`}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {renderChildren()}
      </div>

      {/* Left Navigation Button */}
      {isMounted && (
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
      )}

      {/* Right Navigation Button */}
      {isMounted && (
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
      )}
    </div>
  );
}
