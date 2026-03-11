import Link from "next/link";

export default function FeaturedEventCard({
  id,
  tagline,   // "🎪 CONVENTION"
  title,
  date,      // "15"
  month,     // "MAR 2026"
  imageUrl,
  isFree,
}) {
  // Drop the year — only show "MAR" in the date badge
  const monthLabel = month ? month.split(" ")[0] : null;

  const card = (
    <div className="relative rounded-xl h-40 sm:h-48 md:h-64 w-full sm:w-[400px] md:w-[500px] lg:w-[600px] overflow-hidden group cursor-pointer flex-shrink-0">
      {/* object-top keeps subjects visible on the wide/short landscape crop */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-gray-700" />
      )}

      {/* Gradient: slight top scrim + heavier bottom for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/65" />

      {/* ── Top badges row ── */}
      <div className="absolute top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 z-10 flex items-start justify-between gap-2">

        {/* Category pill — frosted glass + pulsing orange glow */}
        {tagline && (
          <span className="featured-category-pill inline-flex items-center gap-1 bg-white/15 backdrop-blur-md border border-white/25 text-white text-xs font-semibold px-5 py-2.5 rounded-full">
            {tagline}
          </span>
        )}

        {/* Date badge — frosted, same style as PromotedEvents, no year */}
        {date && monthLabel && (
          <div className="flex flex-col items-center bg-white/15 backdrop-blur-md border border-white/25 rounded-xl px-3 py-1.5 shadow-md min-w-11
            transition-all duration-300 group-hover:scale-110 group-hover:bg-white/25 group-hover:border-white/45">
            <span className="text-white text-lg font-bold leading-none">{date}</span>
            <span className="text-white/80 text-[10px] font-semibold uppercase tracking-widest">{monthLabel}</span>
          </div>
        )}
      </div>

      {/* ── Bottom info bar ── */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-3 sm:p-4 md:p-5">
        <h3 className="text-white font-bold text-xl sm:text-2xl md:text-3xl leading-tight mb-2 drop-shadow-sm line-clamp-2">
          {title}
        </h3>

        {/* Free / Paid pill — pulsing glow matching the color */}
        <span className={`inline-flex items-center text-xs font-semibold px-5 py-2 rounded-full backdrop-blur-sm ${
          isFree
            ? "featured-free-pill bg-green-500/75 text-white"
            : "featured-ticket-pill bg-[#FF7927]/80 text-white"
        }`}>
          {isFree ? "Free Entry" : "Get Ticket"}
        </span>
      </div>

      {/* Press overlay — darkens the card on click. Uses after: pseudo-element
          so it doesn't need pointer-events and still responds to parent :active. */}
      <div className="absolute inset-0 bg-black/0 transition-colors duration-150 pointer-events-none z-10 group-active:bg-black/8" />
    </div>
  );

  if (id) {
    return <Link href={`/events/${id}`}>{card}</Link>;
  }

  return card;
}
