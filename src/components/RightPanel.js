export default function RightPanel() {
  return (
    <aside className="w-80 space-y-6 sticky top-20 self-start max-h-[calc(100vh-5rem)] overflow-y-auto">
      {/* Creator Profile Card */}
      <div className="bg-white rounded-xl px-6 pt-0 pb-6 text-gray-900 border border-gray-200">
        <div className="relative">
          {/* Banner */}
          <div className="bg-gradient-to-br from-[#FF7927] to-[#E66B1F] rounded-t-xl h-25 mb-3 -mx-6 overflow-hidden relative">
            {"https://static-cdn.jtvnw.net/jtv_user_pictures/62c9f389-2d02-4011-9721-495b964937e8-profile_banner-480.jpeg" && (
              <>
                <img
                  src={
                    "https://static-cdn.jtvnw.net/jtv_user_pictures/62c9f389-2d02-4011-9721-495b964937e8-profile_banner-480.jpeg"
                  }
                  alt=""
                  className="w-full h-full object-cover absolute inset-0"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent"></div>
              </>
            )}
          </div>

          {/* Profile picture overlapping banner */}
          <div className="absolute bottom-[-45] left-[-3] w-24 h-24 rounded-full border-4 border-white shadow-md overflow-hidden">
            <img
              src="https://c10.patreonusercontent.com/4/patreon-media/p/campaign/12153209/263868ff788c41c7b369424c44762895/eyJoIjozNjAsInciOjM2MH0%3D/5.jpeg?token-hash=VUXa8a7E5fyD2i-C3LX1OgneeOrCuKRwCc6z_CPOpGQ%3D&token-time=1768435200"
              alt="Reaksa Cos Profile"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Creator Info Section */}
        <div className="pt-10">
          {/* Name with Creator badge */}
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg">Reaksa Cos</h3>
            <span className="text-xs bg-[#2ED1E4]/20 text-[#2ED1E4] px-2 py-0.5 rounded-full font-medium">
              Creator
            </span>
          </div>

          {/* Username handle */}
          <p className="text-sm text-gray-500 mb-2">@reaksaCos</p>

          {/* Description */}
          <p className="text-sm text-gray-600 mb-4">Cosplayer & Prop Maker</p>

          {/* Followers count with icon */}
          <div className="flex items-center gap-2 text-sm text-gray-700 mb-4">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
            </svg>
            <span>4,6K Followers</span>
          </div>

          {/* Follow button */}
          <button className="w-full bg-[#FF7927] hover:bg-[#E66B1F] text-white py-2 rounded-full font-medium">
            Follow +
          </button>
        </div>
      </div>

      {/* Trending Now */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-gray-800 mb-4">Trending now</h3>
        <div className="space-y-1">
          {/* Trending Item */}
          <div className="border-b border-gray-100 pb-3">
            <p className="text-orange-500 font-medium text-sm">#chainssawman</p>
            <p className="text-xs text-gray-500">532 Posts</p>
          </div>

          <div className="border-b border-gray-100 pb-3">
            <p className="text-orange-500 font-medium text-sm">#OneCosplays</p>
            <p className="text-xs text-gray-500">645 Posts</p>
          </div>

          <div className="border-b border-gray-100 pb-3">
            <p className="text-orange-500 font-medium text-sm">
              #demonslayercosmode
            </p>
            <p className="text-xs text-gray-500">737 Posts</p>
          </div>

          <div className="pb-3">
            <p className="text-orange-500 font-medium text-sm">#onePie3d3</p>
            <p className="text-xs text-gray-500">467 Posts</p>
          </div>
        </div>
      </div>

      {/* Recommended Users */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-gray-800 mb-4">Recommended users</h3>
        <div className="space-y-4">
          {/* User Item */}
          {[
            {
              name: "James007",
              username: "shinraTensei123",
              avatar:
                "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR-7HvDghOAEqLBvRqUMe6cC8lD9po71veMeg&s",
            },
            {
              name: "Luna Mai",
              username: "lunamai",
              avatar:
                "https://i.pinimg.com/736x/07/30/87/0730879ca7bcb351f93c195fa05605b3.jpg",
            },
            {
              name: "Anime Power",
              username: "animepower",
              avatar:
                "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQGBTqsz7uRiK__anUS-dq3Rj7jZcxjT8-Bcg&s",
            },
          ].map((user, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-300 rounded-full flex-shrink-0 overflow-hidden">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-xl">
                    👤
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm text-gray-800">{user.name}</p>
                <p className="text-xs text-gray-500">@{user.username}</p>
              </div>
              <button className="bg-[#FF7927] hover:bg-[#E66B1F] text-white px-4 py-1.5 rounded-full text-xs font-medium">
                Follow
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Footer / Copyright */}
      <div className="space-y-2 pb-8">
        <div className="flex justify-center gap-4 text-gray-400 text-xs">
          <p>© 2025 AniCon. All rights reserved.</p>
        </div>
        <div className="flex justify-center gap-3 text-gray-400 text-xs">
          <a href="#" className="hover:text-[#FF7927]">
            Privacy
          </a>
          <span>•</span>
          <a href="#" className="hover:text-[#FF7927]">
            Terms
          </a>
          <span>•</span>
          <a href="#" className="hover:text-[#FF7927]">
            About
          </a>
        </div>
      </div>
    </aside>
  );
}
