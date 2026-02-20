"use client";

import { useState, useEffect, useRef } from "react";
import EventCard from "./EventCard";
import EventCarousel from "./EventCarousel";
import { trendingEvents, cosplayEvents } from "@/data/mockEvents";

function AnimatedSection({ children }) {
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

  return (
    <section
      ref={sectionRef}
      className={`transition-all duration-700 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
    >
      {children}
    </section>
  );
}

export default function EventSections() {
  return (
    <div className="space-y-8">
      {/* Trending Events */}
      <AnimatedSection>
        <h2 className="text-xl font-bold text-gray-800">Trending Events</h2>
        <EventCarousel>
          {trendingEvents.map((event) => (
            <EventCard
              key={event.id}
              id={event.id}
              title={event.title}
              date={`${event.date}, ${event.time}`}
              location={event.location}
              imageUrl={event.imageUrl}
            />
          ))}
        </EventCarousel>
      </AnimatedSection>

      {/* Cosplay Events */}
      <AnimatedSection>
        <h2 className="text-xl font-bold text-gray-800">Cosplay Events</h2>
        <EventCarousel>
          {cosplayEvents.map((event) => (
            <EventCard
              key={event.id}
              id={event.id}
              title={event.title}
              date={`${event.date}, ${event.time}`}
              location={event.location}
              imageUrl={event.imageUrl}
            />
          ))}
        </EventCarousel>
      </AnimatedSection>
    </div>
  );
}
