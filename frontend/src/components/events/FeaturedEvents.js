"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import EventCarousel from "./EventCarousel";
import FeaturedEventCard from "./FeaturedEventCard";
import { eventApi, normalizeEvent } from "@/lib/api";

// Emoji per category for the tagline displayed on each card
const CATEGORY_EMOJI = {
  convention: "🎪",
  meetup: "🎭",
  workshop: "🛠️",
  concert: "🎵",
  competition: "🏆",
  screening: "🎬",
};

// Format "2026-03-15" → "15"
function formatDay(isoDate) {
  if (!isoDate) return null;
  return String(parseInt(String(isoDate).split("-")[2], 10));
}

// Format "2026-03-15" → "MAR 2026"
function formatMonthYear(isoDate) {
  if (!isoDate) return null;
  const [year, month] = String(isoDate).split("-");
  const names = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  return `${names[parseInt(month, 10) - 1]} ${year}`;
}

// Map a normalized event to the shape FeaturedEventCard expects
function toFeaturedCard(event) {
  const cat = event.category?.toLowerCase() ?? "";
  const emoji = CATEGORY_EMOJI[cat] ?? "🎌";
  return {
    id: event.id,
    tagline: `${emoji} ${(event.category ?? "EVENT").toUpperCase()}`,
    title: event.title,
    date: formatDay(event.eventDate),
    month: formatMonthYear(event.eventDate),
    imageUrl: event.coverImageUrl || event.imageUrl || null,
    isFree: event.isFree,
  };
}

export default function FeaturedEvents() {
  const [isVisible, setIsVisible] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const sectionRef = useRef(null);

  // Two-layer crossfade background: Layer A and B alternate visibility.
  // When cycling, we pre-load the next image into the inactive layer before fading it in.
  const [bgLayerA, setBgLayerA] = useState("");
  const [bgLayerB, setBgLayerB] = useState("");
  const [activeLayer, setActiveLayer] = useState("A"); // which layer is fully visible
  // Stable ref to the current images list so interval callbacks don't go stale
  const eventImagesRef = useRef([]);
  const bgIndexRef = useRef(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.2 },
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    eventApi
      .listEvents()
      .then((data) => setEvents(data.map(normalizeEvent)))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  const featuredCards = events.map(toFeaturedCard);

  // Keep the images ref current so interval callbacks always see the latest list
  const eventImages = featuredCards.map((e) => e.imageUrl).filter(Boolean);
  eventImagesRef.current = eventImages;

  // Seed Layer A with the first event image as soon as events load
  useEffect(() => {
    if (eventImages.length === 0) return;
    setBgLayerA(eventImages[0]);
    bgIndexRef.current = 0;
    // Only run once when events first become available (length goes from 0 → N)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventImages.length > 0]);

  // Cycle background image every 5 s with a 1 s CSS crossfade between layers.
  // Only runs when there are at least 2 images to cycle through.
  useEffect(() => {
    if (eventImages.length < 2) return;

    const id = setInterval(() => {
      const images = eventImagesRef.current;
      if (images.length < 2) return;

      bgIndexRef.current = (bgIndexRef.current + 1) % images.length;
      const nextImage = images[bgIndexRef.current];

      // Preload the image before fading so the inactive layer is ready
      // when it becomes visible — avoids a gray flash while the browser fetches it.
      const img = new Image();
      const doSwap = () => {
        setActiveLayer((prev) => {
          if (prev === "A") {
            setBgLayerB(nextImage);
            return "B";
          } else {
            setBgLayerA(nextImage);
            return "A";
          }
        });
      };
      img.onload = doSwap;
      // If the image fails, skip this cycle — swapping to a broken URL shows
      // the bg-gray-900 fallback (appears black). Better to stay on current image.
      img.onerror = () => {};
      img.src = nextImage;
    }, 5000);

    return () => clearInterval(id);
    // Re-run only when the image count changes (i.e., events load or are filtered)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventImages.length]);

  return (
    <div
      ref={sectionRef}
      className={`mb-8 transition-all duration-400 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
    >
      {/* Section Header */}
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Featured Events</h2>
        <Link
          href="/events"
          className="text-sm text-gray-500 hover:text-[#FF7927] transition-colors"
        >
          Show all →
        </Link>
      </div>

      {/* Background Container — two crossfade layers + dark dim overlay */}
      {/* bg-gray-900 is the fallback shown before images load or if all images fail */}
      <div className="relative rounded-xl overflow-hidden p-6 bg-gray-900">
        {/* Layer A — fades in/out as activeLayer toggles */}
        <div
          className={`absolute inset-0 bg-cover bg-top transition-opacity duration-1000 ${
            activeLayer === "A" ? "opacity-100" : "opacity-0"
          }`}
          style={
            bgLayerA ? { backgroundImage: `url('${bgLayerA}')` } : undefined
          }
        />
        {/* Layer B — the counterpart to Layer A */}
        <div
          className={`absolute inset-0 bg-cover bg-top transition-opacity duration-1000 ${
            activeLayer === "B" ? "opacity-100" : "opacity-0"
          }`}
          style={
            bgLayerB ? { backgroundImage: `url('${bgLayerB}')` } : undefined
          }
        />
        {/* Dark overlay — dims the background so cards remain readable */}
        <div className="absolute inset-0 bg-black/65 sm:bg-black/45" />

        {/* Skeleton shimmer while events are loading */}
        {loading && (
          <div className="relative z-10 flex gap-4 overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="rounded-xl h-40 sm:h-48 md:h-64 w-[280px] sm:w-100 md:w-125 lg:w-150 bg-white/20 animate-pulse shrink-0"
              />
            ))}
          </div>
        )}

        {/* Real events carousel */}
        {!loading && featuredCards.length > 0 && (
          <div className="relative z-10">
            <EventCarousel autoPlay={true}>
              {featuredCards.map((event) => (
                <FeaturedEventCard key={event.id} {...event} />
              ))}
            </EventCarousel>
          </div>
        )}
      </div>
    </div>
  );
}
