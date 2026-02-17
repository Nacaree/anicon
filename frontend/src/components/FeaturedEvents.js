"use client";

import EventCarousel from "./EventCarousel";
import FeaturedEventCard from "./FeaturedEventCard";

export default function FeaturedEvents() {
  const featuredEvents = [
    {
      id: "tr1",
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
      id: "tr2",
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
      id: "tr3",
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
      id: "tr4",
      tagline: "🎌 SUMMER FEST",
      title: "TOKYO",
      subtitle: "GAME SHOW",
      date: "15-17",
      month: "JUL 2025",
      imageUrl:
        "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&h=256&fit=crop",
      ctaButton: null,
    },
    {
      id: "tr5",
      tagline: "🎧 MUSIC LIVE",
      title: "ANISONG",
      subtitle: "CONCERT",
      date: "05-07",
      month: "AUG 2025",
      imageUrl:
        "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&h=256&fit=crop",
      ctaButton: { text: "Book Now", show: true },
    },
    {
      id: "tr6",
      tagline: "🎮 ESPORTS",
      title: "GAMING",
      subtitle: "TOURNAMENT",
      date: "20-22",
      month: "SEP 2025",
      imageUrl:
        "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&h=256&fit=crop",
      ctaButton: null,
    },
    {
      id: "tr7",
      tagline: "🎎 TRADITION",
      title: "KYOTO",
      subtitle: "CULTURE FEST",
      date: "10-12",
      month: "OCT 2025",
      imageUrl:
        "https://images.unsplash.com/photo-1528360983277-13d9b152c58b?w=600&h=256&fit=crop",
      ctaButton: null,
    },
    {
      id: "tr8",
      tagline: "🎃 HALLOWEEN",
      title: "SPOOKY",
      subtitle: "COSPLAY NIGHT",
      date: "31",
      month: "OCT 2025",
      imageUrl:
        "https://images.unsplash.com/photo-1509557965875-b88c97052f0e?w=600&h=256&fit=crop",
      ctaButton: { text: "Join Party", show: true },
    },
    {
      id: "tr9",
      tagline: "❄️ WINTER",
      title: "SNOW",
      subtitle: "FESTIVAL",
      date: "15-20",
      month: "DEC 2025",
      imageUrl:
        "https://images.unsplash.com/photo-1482686119632-c6041ef687e3?w=600&h=256&fit=crop",
      ctaButton: null,
    },
    {
      id: "tr10",
      tagline: "🎆 NEW YEAR",
      title: "COUNTDOWN",
      subtitle: "PARTY",
      date: "31",
      month: "DEC 2025",
      imageUrl:
        "https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=600&h=256&fit=crop",
      ctaButton: null,
    },
    {
      id: "tr11",
      tagline: "🌸 SPRING",
      title: "SAKURA",
      subtitle: "PICNIC",
      date: "01-05",
      month: "APR 2026",
      imageUrl:
        "https://images.unsplash.com/photo-1522383225653-ed111181a951?w=600&h=256&fit=crop",
      ctaButton: { text: "RSVP", show: true },
    },
    {
      id: "tr12",
      tagline: "🏖️ SUMMER",
      title: "BEACH",
      subtitle: "BASH",
      date: "15-17",
      month: "JUN 2026",
      imageUrl:
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=256&fit=crop",
      ctaButton: null,
    },
  ];

  return (
    <div className="mb-8">
      {/* Section Header */}
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Featured Events</h2>
        <button className="text-sm text-gray-500 hover:text-[#FF7927] transition-colors">
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
