import EventCard from "./EventCard";
import EventCarousel from "./EventCarousel";
import { trendingEvents, cosplayEvents } from "@/data/mockEvents";

export default function EventSections() {
  return (
    <div className="space-y-8">
      {/* Trending Events */}
      <section>
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
      </section>

      {/* Cosplay Events */}
      <section>
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
      </section>
    </div>
  );
}
