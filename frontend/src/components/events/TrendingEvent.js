"use client";

const trendingEvent = {
  id: "rec1",
  title: "Event Name Event Name 2026",
  description:
    "Event Details Event Details Event Details Event Details Event Details Event Details Event Details Event Details",
  tags: ["#tags", "#Anime", "#Cultural", "#Cosplay"],
  imageUrl: null,
  thumbnails: [null, null, null],
};

export default function TrendingEvent() {
  const handleShare = async () => {
    const shareData = {
      title: trendingEvent.title,
      text: `Check out ${trendingEvent.title} on AniCon!`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <section>
      <h2 className="text-xl font-bold text-gray-900 mb-4">Trending Event</h2>

      <div className="bg-gray-100 rounded-2xl overflow-hidden flex flex-col md:flex-row">
        {/* Left Image */}
        <div className="relative w-full md:w-1/2 h-48 md:h-auto min-h-[200px]">
          {trendingEvent.imageUrl ? (
            <img
              src={trendingEvent.imageUrl}
              alt={trendingEvent.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-300" />
          )}
        </div>

        {/* Right Content */}
        <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-lg sm:text-xl text-gray-900 mb-2">
              {trendingEvent.title}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {trendingEvent.description}
            </p>

            {/* Tags */}
            <div className="flex items-center gap-1.5 flex-wrap mb-4">
              <span className="text-xs text-gray-400">Tags For this Event:</span>
              {trendingEvent.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-white border border-gray-200 px-2.5 py-1 rounded-full text-gray-600"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Actions Row */}
            <div className="flex items-center gap-3 mb-4">
              <button className="bg-white border border-gray-200 text-gray-700 text-sm font-medium px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                Button
              </button>
              <button
                onClick={handleShare}
                className="p-2 rounded-full bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                aria-label="Share"
              >
                <svg
                  className="w-4 h-4 text-[#FF7927]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Thumbnail Images */}
          <div className="flex gap-3">
            {trendingEvent.thumbnails.map((thumb, i) => (
              <div
                key={i}
                className="w-24 h-16 sm:w-28 sm:h-20 rounded-lg overflow-hidden flex-shrink-0"
              >
                {thumb ? (
                  <img
                    src={thumb}
                    alt={`Preview ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className={`w-full h-full ${
                      i === 0
                        ? "bg-orange-400"
                        : i === 1
                        ? "bg-pink-400"
                        : "bg-gray-300"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
