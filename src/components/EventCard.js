export default function EventCard({ title, date, location, imageUrl }) {
  // Fallback to placeholder if no image provided
  const finalImageUrl =
    imageUrl ||
    "https://images.unsplash.com/photo-1613376023733-0a73315d9b06?w=400&h=300&fit=crop";

  return (
    <div className="relative rounded-xl h-50 overflow-hidden group cursor-pointer transition-all duration-300 flex-shrink-0 w-80">
      {/* Background Image */}
      <img
        src={finalImageUrl}
        alt={title}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
        <h3 className="font-bold text-lg mb-2 transition-colors duration-300 group-hover:text-[#FF7927]">
          {title}
        </h3>
        <p className="text-sm text-gray-200 mb-1 transition-colors duration-300 group-hover:text-[#FF7927]">
          📅 {date}
        </p>
        <p className="text-sm text-gray-200 transition-colors duration-300 group-hover:text-[#FF7927]">
          📍 {location}
        </p>
      </div>
    </div>
  );
}
