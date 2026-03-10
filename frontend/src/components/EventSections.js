"use client";

import { useState, useEffect, useRef } from "react";
import EventCard from "./EventCard";
import EventCarousel from "./EventCarousel";
import { eventApi, normalizeEvent } from "@/lib/api";

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
      className={`transition-all duration-400 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
    >
      {children}
    </section>
  );
}

export default function EventSections() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    eventApi
      .listEvents()
      .then((data) => setEvents(data.map(normalizeEvent)))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  const trendingEvents = events.slice(0, 10);
  const cosplayEvents = events.filter((e) =>
    e.tags?.some((t) => t.toLowerCase().includes("cosplay"))
  );

  if (loading) {
    return (
      <div className="space-y-8">
        {[0, 1].map((i) => (
          <section key={i}>
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="flex gap-4 overflow-hidden">
              {[...Array(4)].map((_, j) => (
                <div
                  key={j}
                  className="w-64 h-50 bg-gray-200 rounded-xl flex-shrink-0 animate-pulse"
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {trendingEvents.length > 0 && (
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
      )}

      {cosplayEvents.length > 0 && (
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
      )}
    </div>
  );
}
