import EventCard from './EventCard';

export default function EventSections() {
  return (
    <div className="space-y-8">
      {/* Trending Events */}
      <section>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Trending Events</h2>
        <div className="grid grid-cols-3 gap-4">
          <EventCard />
          <EventCard />
          <EventCard />
        </div>
      </section>

      {/* Cosplay Events */}
      <section>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Cosplay Events</h2>
        <div className="grid grid-cols-3 gap-4">
          <EventCard />
          <EventCard />
          <EventCard />
        </div>
      </section>
    </div>
  );
}
