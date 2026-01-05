export default function FeaturedEvents() {
  return (
    <div className="mb-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Featured Events</h2>
        <button className="text-sm text-gray-500 hover:text-gray-700">
          Show all →
        </button>
      </div>

      {/* Events Carousel */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {/* Event Card 1 - JKTANIME */}
        <div className="min-w-[400px] h-48 bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl p-6 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="z-10">
            <p className="text-xs mb-2 opacity-90">I'M READY FOR</p>
            <h3 className="text-4xl font-bold mb-2">JKTANIME</h3>
            <p className="text-3xl font-light italic">2025</p>
            <p className="text-sm mt-2">10-12</p>
            <p className="text-xs">JAN 2025</p>
          </div>
          {/* Decorative anime character would go here */}
          <div className="absolute right-0 top-0 w-40 h-full bg-pink-400 opacity-30 rounded-full blur-3xl"></div>
        </div>

        {/* Event Card 2 - ANIMECON */}
        <div className="min-w-[400px] h-48 bg-gradient-to-r from-blue-900 to-purple-900 rounded-xl p-6 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="z-10">
              <p className="text-xs mb-2 opacity-90">⚡ JAPAN JAM</p>
              <h3 className="text-4xl font-bold mb-2">ANIMECON</h3>
              <p className="text-lg">ANIME FESTIVAL</p>
            </div>
          </div>
          <button className="self-end bg-pink-500 text-white px-4 py-2 rounded-lg text-sm font-medium z-10">
            Get Ticket
          </button>
          {/* Decorative anime character would go here */}
          <div className="absolute right-0 top-0 w-40 h-full bg-blue-400 opacity-20 rounded-full blur-3xl"></div>
        </div>
      </div>
    </div>
  );
}
