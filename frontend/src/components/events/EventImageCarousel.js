"use client";

import { useState, useCallback, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

const MAX_SLIDES = 5;

export default function EventImageCarousel({ images = [], thumbnails = [], loading = false }) {
  const [api, setApi] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const slides = images.length > 0 ? images.slice(0, MAX_SLIDES) : [null];
  const thumbs = thumbnails.length > 0
    ? thumbnails.slice(0, slides.length)
    : slides.map(() => null);
  const hasMultiple = slides.length > 1;

  const onSelect = useCallback(() => {
    if (!api) return;
    setActiveIndex(api.selectedScrollSnap());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    onSelect();
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

  const scrollTo = useCallback(
    (index) => {
      if (!api) return;
      api.scrollTo(index);
    },
    [api]
  );

  if (loading) {
    return (
      <div>
        <Skeleton className="rounded-xl aspect-video mb-3" />
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="w-20 h-14 sm:w-24 sm:h-16 rounded-lg shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Main Carousel */}
      <Carousel
        setApi={setApi}
        opts={{ loop: hasMultiple }}
        className="group relative rounded-xl overflow-hidden mb-3"
      >
        <CarouselContent>
          {slides.map((src, i) => (
            <CarouselItem key={i}>
              <div className="aspect-video bg-gray-200">
                {src ? (
                  <img
                    src={src}
                    alt={`Slide ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-linear-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Nav Arrows - show on hover, hidden for single image */}
        {hasMultiple && (
          <>
            <button
              onClick={() => api?.scrollPrev()}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-gray-50"
              aria-label="Previous slide"
            >
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => api?.scrollNext()}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-gray-50"
              aria-label="Next slide"
            >
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => scrollTo(i)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i === activeIndex
                      ? "bg-white scale-110"
                      : "bg-white/50 hover:bg-white/70"
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </Carousel>

      {/* Thumbnail Strip - hidden for single image */}
      {hasMultiple && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {thumbs.map((thumb, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              className={`w-20 h-14 sm:w-24 sm:h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-colors duration-200 ${
                i === activeIndex ? "border-[#FF7927]" : "border-transparent hover:border-gray-300"
              }`}
            >
              {thumb ? (
                <img
                  src={thumb}
                  alt={`Thumbnail ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-linear-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
