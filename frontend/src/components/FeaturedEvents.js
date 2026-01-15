"use client";

import EventCarousel from "./EventCarousel";
import FeaturedEventCard from "./FeaturedEventCard";

export default function FeaturedEvents() {
  const featuredEvents = [
    {
      id: 1,
      tagline: "I'M READY FOR",
      title: "JKTANIME",
      subtitle: "2025",
      date: "10-12",
      month: "JAN 2025",
      imageUrl:
        "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&h=256&fit=crop",
      ctaButton: null,
    },
    {
      id: 2,
      tagline: "⚡ JAPAN JAM",
      title: "ANIMECON",
      subtitle: "ANIME FESTIVAL",
      date: null,
      month: null,
      imageUrl:
        "https://images.unsplash.com/photo-1613376023733-0a73315d9b06?w=600&h=256&fit=crop",
      ctaButton: { text: "Get Ticket", show: true },
    },
    {
      id: 3,
      tagline: "✨ SPRING EDITION",
      title: "COSPLAY",
      subtitle: "EXPO",
      date: "25-27",
      month: "MAR 2025",
      imageUrl:
        "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=600&h=256&fit=crop",
      ctaButton: null,
    },
    {
      id: 4,
      tagline: "🎌 SUMMER FEST",
      title: "TOKYO",
      subtitle: "GAME SHOW",
      date: "15-17",
      month: "JUL 2025",
      imageUrl:
        "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&h=256&fit=crop",
      ctaButton: null,
    },
  ];

  return (
    <div className="mb-8">
      {/* Section Header */}
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Featured Events</h2>
        <button className="text-sm text-gray-500 hover:text-[#FF7927]">
          Show all →
        </button>
      </div>

      {/* Background Container with Image and Gradient */}
      <div className="relative rounded-xl overflow-hidden p-6">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&h=400&fit=crop')",
          }}
        ></div>

        {/* Events Carousel */}
        <div className="relative z-10">
          <EventCarousel hideGradients={true}>
            {featuredEvents.map((event) => (
              <FeaturedEventCard key={event.id} {...event} />
            ))}
          </EventCarousel>
        </div>
      </div>
    </div>
  );
}
