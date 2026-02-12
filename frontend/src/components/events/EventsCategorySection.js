import EventsPageCard from "./EventsPageCard";
import EventCarousel from "@/components/EventCarousel";

export default function EventsCategorySection({ title, emoji, events }) {
  return (
    <section>
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
