import Link from "next/link";

export default function FeaturedEventCard({
  id,
  tagline,
  title,
  subtitle,
  date,
  month,
  imageUrl,
  ctaButton,
}) {
  const card = (
    <div className="relative rounded-xl h-40 sm:h-48 md:h-64 w-full sm:w-[400px] md:w-[500px] lg:w-[600px] overflow-hidden group cursor-pointer flex-shrink-0">
      {/* Background Image */}
      <img
        src={imageUrl}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />

      {/* Gradient Overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent"></div>

      {/* Content */}
      <div className="relative h-full flex flex-col justify-between p-4 sm:p-5 md:p-6 text-white z-10">
        <div>
          {tagline && <p className="text-xs mb-1 sm:mb-2 opacity-90">{tagline}</p>}
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">{title}</h3>
          {subtitle && (
            <p className="text-xl sm:text-2xl md:text-3xl font-light italic">{subtitle}</p>
          )}
          {date && <p className="text-xs sm:text-sm mt-1 sm:mt-2">{date}</p>}
          {month && <p className="text-xs">{month}</p>}
        </div>

        {ctaButton?.show && (
          <button className="self-end bg-[#FF7927] hover:bg-[#E66D20] text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
            {ctaButton.text}
          </button>
        )}
      </div>
    </div>
  );

  if (id) {
    return <Link href={`/events/${id}`}>{card}</Link>;
  }

  return card;
}
