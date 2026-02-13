"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function EventImageCarousel({ images = [], thumbnails = [], loading = false }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const slides = images.length > 0 ? images : [null, null, null];
  const thumbs = thumbnails.length > 0 ? thumbnails : [null, null, null, null];

  if (loading) {
    return (
      <div>
        <Skeleton className="rounded-xl aspect-[16/9] mb-3" />
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="w-20 h-14 sm:w-24 sm:h-16 rounded-lg flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Main Image */}
      <div className="relative rounded-xl overflow-hidden aspect-[16/9] bg-gray-200 mb-3">
        {slides[activeIndex] ? (
          <img
            src={slides[activeIndex]}
            alt={`Slide ${activeIndex + 1}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Dots */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === activeIndex ? "bg-white" : "bg-white/50"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Thumbnail Strip */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {thumbs.map((thumb, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i < slides.length ? i : 0)}
            className={`w-20 h-14 sm:w-24 sm:h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors ${
              i === activeIndex ? "border-[#FF7927]" : "border-transparent"
            }`}
          >
            {thumb ? (
              <img
                src={thumb}
                alt={`Thumbnail ${i + 1}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </button>
        ))}

        {/* Next arrow indicator */}
        {thumbs.length > 4 && (
          <div className="flex items-center justify-center w-6 flex-shrink-0 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
