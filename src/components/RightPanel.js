export default function RightPanel() {
  return (
    <aside className="w-72 fixed right-0 top-16 h-[calc(100vh-4rem)] overflow-y-auto p-6 space-y-6">
      {/* Creator Profile Card */}
      <div className="bg-gradient-to-br from-pink-400 to-orange-400 rounded-xl p-6 text-white">
        <div className="flex flex-col items-center">
          {/* Avatar */}
          <div className="w-16 h-16 bg-yellow-300 rounded-full mb-3 flex items-center justify-center text-2xl">
            👤
          </div>

          {/* Name */}
          <h3 className="font-bold text-lg mb-1">Reaksa Cos</h3>
          <p className="text-sm opacity-90 mb-4">Cosplayer & Prop Maker</p>

          {/* Stats */}
          <div className="flex gap-6 mb-4 text-sm">
            <div className="text-center">
              <p className="font-bold">#reaksacos</p>
              <p className="opacity-75 text-xs">Article</p>
            </div>
            <div className="text-center">
              <p className="font-bold">400</p>
              <p className="opacity-75 text-xs">Posts</p>
            </div>
          </div>

          {/* Follow Button */}
          <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-medium">
            Follow Creator
          </button>
        </div>
      </div>

      {/* Trending Now */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-gray-800 mb-4">Trending now</h3>
        <div className="space-y-3">
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
            <p className="text-orange-500 font-medium text-sm">#demonslayercosmode</p>
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
        <div className="space-y-3">
          {/* User Item */}
          {['testy', 'Luna Mai', 'Anime Power'].map((user, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                <div>
                  <p className="font-medium text-sm text-gray-800">{user}</p>
                  <p className="text-xs text-gray-500">@{user.toLowerCase().replace(' ', '')}</p>
                </div>
              </div>
              <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1 rounded-full text-xs font-medium">
                Follow
              </button>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
