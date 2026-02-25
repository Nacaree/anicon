const promotedEventsData = [
  {
    id: 1,
    title: "Event Name Event Name 2026",
    description:
      "Event Details Event Details Event Details Event Details Event Details Event Details",
    tags: ["#tags", "#Anime", "#Cultural", "#Cosplay"],
    imageUrl: null,
  },
  {
    id: 2,
    title: "Event Name Event Name 2026",
    description:
      "Event Details Event Details Event Details Event Details Event Details Event Details",
    tags: ["#tags", "#Anime", "#Cultural", "#Cosplay"],
    imageUrl: null,
  },
];

function PromotedEventCard({ event }) {
  return (
    <div className="relative flex-1 min-w-0 rounded-2xl overflow-hidden h-56 sm:h-64 md:h-72 group cursor-pointer">
      {/* Background */}
      {event.imageUrl ? (
        <img
          src={event.imageUrl}
          alt={event.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gray-300" />
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

      {/* Promoted Badge */}
      <div className="absolute top-4 left-4 z-10">
        <span className="bg-[#FF7927] text-white text-xs font-semibold px-3 py-1 rounded-md">
          Promoted Event
        </span>
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 text-white z-10">
        <h3 className="font-bold text-lg sm:text-xl mb-1 line-clamp-1">
          {event.title}
        </h3>
        <p className="text-xs sm:text-sm text-gray-200 mb-3 line-clamp-2">
          {event.description}
        </p>

        {/* Tags */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-gray-300">Tags For this Event:</span>
          {event.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PromotedEvents() {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {promotedEventsData.map((event) => (
        <PromotedEventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
