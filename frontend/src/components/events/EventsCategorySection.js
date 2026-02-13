"use client";

import { useState, useEffect, useRef } from "react";
import EventsPageCard from "./EventsPageCard";
import EventCarousel from "@/components/EventCarousel";

export default function EventsCategorySection({ title, emoji, events, loading = false }) {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  if (loading) {
    return (
      <section>
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="flex gap-4 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-56 shrink-0 animate-pulse">
              <div className="h-36 bg-gray-200 rounded-xl mb-2" />
              <div className="h-4 w-3/4 bg-gray-200 rounded mb-1" />
              <div className="h-3 w-1/2 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className={`transition-all duration-700 ease-out ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-6"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          {emoji && <span>{emoji}</span>}
          {title}
        </h2>
      </div>

      <EventCarousel enableEnlarge>
        {events.map((event) => (
          <EventsPageCard key={event.id} event={event} />
        ))}
      </EventCarousel>
    </section>
  );
}
