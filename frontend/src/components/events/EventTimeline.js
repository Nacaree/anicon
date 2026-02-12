"use client";

import { useState, useMemo } from "react";
import EventsPageCard from "./EventsPageCard";
import EventCarousel from "@/components/EventCarousel";

const categories = ["All", "Cosplays", "Cultural", "Meetups"];

const months = [
  { key: "jan", label: "JAN", color: "bg-[#FF7927]" },
  { key: "feb", label: "FEB", color: "bg-pink-400" },
  { key: "mar", label: "MAR", color: "bg-[#FF7927]" },
  { key: "apr", label: "APR", color: "bg-pink-400" },
  { key: "may", label: "MAY", color: "bg-[#FF7927]" },
  { key: "jun", label: "JUN", color: "bg-pink-400" },
];

const timelineEvents = [
  {
    id: "t1",
    title: "Spring Sakura 2026",
    date: "Jan 18",
    time: "10 AM",
    location: "Chip Mong Tower, PH",
    wantToGoCount: 1200,
    category: "All",
    month: "jan",
    imageUrl: null,
  },
  {
    id: "t2",
    title: "Spring Sakura 2026",
    date: "Jan 18",
    time: "10 AM",
    location: "Chip Mong Tower, PH",
    wantToGoCount: 1200,
    category: "Cosplays",
    month: "jan",
    imageUrl: null,
  },
  {
    id: "t3",
    title: "Spring Sakura 2026",
    date: "Jan 18",
    time: "10 AM",
    location: "Chip Mong Tower, PH",
    wantToGoCount: 1200,
    category: "Cultural",
    month: "jan",
    imageUrl: null,
  },
  {
    id: "t4",
    title: "Spring Sakura 2026",
    date: "Jan 18",
    time: "10 AM",
    location: "Chip Mong Tower, PH",
    wantToGoCount: 1200,
    category: "Hang out",
    month: "jan",
    imageUrl: null,
  },
  {
    id: "t5",
    title: "Anime Fest Cambodia",
    date: "Feb 10",
    time: "10 AM",
    location: "Koh Pich Convention, PH",
    wantToGoCount: 890,
    category: "Cosplays",
    month: "feb",
    imageUrl: null,
  },
  {
    id: "t6",
    title: "Cosplay Carnival",
    date: "Feb 22",
    time: "2 PM",
    location: "AEON Mall, PH",
    wantToGoCount: 650,
    category: "Cosplays",
    month: "feb",
    imageUrl: null,
  },
  {
    id: "t7",
    title: "Cultural Heritage Fest",
    date: "Mar 5",
    time: "9 AM",
    location: "National Museum, PH",
    wantToGoCount: 2100,
    category: "Cultural",
    month: "mar",
    imageUrl: null,
  },
  {
    id: "t8",
    title: "Spring Sakura 2026",
    date: "Mar 15",
    time: "10 AM",
    location: "Chip Mong Tower, PH",
    wantToGoCount: 1500,
    category: "All",
    month: "mar",
    imageUrl: null,
  },
];

export default function EventTimeline() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeMonth, setActiveMonth] = useState(null);

  const filteredEvents = useMemo(() => {
    return timelineEvents.filter((event) => {
      const matchesCategory =
        activeCategory === "All" || event.category === activeCategory;
      const matchesMonth = !activeMonth || event.month === activeMonth;
      return matchesCategory && matchesMonth;
    });
  }, [activeCategory, activeMonth]);

  return (
    <section>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mb-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <span className="text-xl">🎪</span>
          EVENT TIMELINE
        </h2>

        {/* Category Tabs */}
        <div className="flex items-center gap-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-sm px-3 py-1 rounded-full transition-colors ${
                activeCategory === cat
                  ? "text-[#FF7927] font-semibold"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Bar with Month Markers */}
      <div className="relative mb-6">
        {/* The timeline line */}
        <div className="h-1 bg-gradient-to-r from-[#FF7927] via-pink-300 to-[#FF7927] rounded-full" />

        {/* Month markers */}
        <div className="flex justify-between mt-0 relative">
          {months.map((month) => (
            <button
              key={month.key}
              onClick={() =>
                setActiveMonth(activeMonth === month.key ? null : month.key)
              }
              className={`-mt-3 flex flex-col items-center transition-transform ${
                activeMonth === month.key ? "scale-110" : ""
              }`}
            >
              <span
                className={`${month.color} text-white text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  activeMonth === month.key
                    ? "ring-2 ring-offset-1 ring-[#FF7927]"
                    : ""
                }`}
              >
                {month.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Events Carousel */}
      {filteredEvents.length > 0 ? (
        <EventCarousel enableEnlarge>
          {filteredEvents.map((event) => (
            <EventsPageCard key={event.id} event={event} />
          ))}
        </EventCarousel>
      ) : (
        <div className="text-center py-8 text-gray-400 text-sm">
          No events found
        </div>
      )}
    </section>
  );
}
