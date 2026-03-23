"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Instagram-style image carousel using native CSS scroll-snap.
 * Smooth horizontal scrolling via trackpad, touch, or arrow buttons.
 * Uses IntersectionObserver to track which slide is active.
 */
export default function PostImageCarousel({ images, className = "" }) {
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef(null);
  const slideRefs = useRef([]);

  const count = images.length;
  if (count === 0) return null;

  // Track which slide is in view using IntersectionObserver
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || count <= 1) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const index = Number(entry.target.dataset.index);
            if (!isNaN(index)) setCurrent(index);
          }
        }
      },
      { root: container, threshold: 0.5 }
    );

    slideRefs.current.forEach((slide) => {
      if (slide) observer.observe(slide);
    });

    return () => observer.disconnect();
  }, [count]);

  // Scroll to a specific slide when clicking arrows or dots.
  // Uses container.scrollTo instead of scrollIntoView to avoid scrolling the page.
  const scrollTo = useCallback((index) => {
    const container = scrollRef.current;
    const slide = slideRefs.current[index];
    if (container && slide) {
      container.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
    }
  }, []);

  return (
    <div className={`relative group overflow-hidden bg-black ${className}`}>
      {/* Scrollable image strip with snap */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar h-full"
      >
        {images.map((img, i) => (
          <div
            key={img.id || i}
            ref={(el) => (slideRefs.current[i] = el)}
            data-index={i}
            className="w-full flex-shrink-0 snap-center flex items-center justify-center min-h-[200px]"
          >
            <img
              src={img.imageUrl}
              alt={`Post image ${i + 1}`}
              className="max-w-full max-h-full mx-auto block object-contain"
              loading={i === 0 ? "eager" : "lazy"}
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* Arrow buttons — visible on hover */}
      {count > 1 && (
        <>
          {current > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); scrollTo(current - 1); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {current < count - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); scrollTo(current + 1); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </>
      )}

      {/* Dot indicators */}
      {count > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); scrollTo(i); }}
              className="p-2 flex items-center justify-center"
              aria-label={`Go to image ${i + 1}`}
            >
              <span className={`block rounded-full transition-all ${i === current ? "w-3 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50 hover:bg-white/80"}`} />
            </button>
          ))}
        </div>
      )}

      {/* Image counter badge (top right) */}
      {count > 1 && (
        <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
          {current + 1}/{count}
        </div>
      )}
    </div>
  );
}
