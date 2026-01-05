export default function PostCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      {/* User Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center overflow-hidden">
          {/* User Avatar - placeholder */}
          <div className="w-full h-full bg-gradient-to-br from-red-500 to-red-700"></div>
        </div>
        <div>
          <h4 className="font-bold text-gray-900">Anime Power</h4>
          <p className="text-sm text-gray-500">@AniPower</p>
        </div>
      </div>

      {/* Text Box */}
      <div className="bg-gray-200 rounded-lg p-6 mb-4 flex items-center justify-center h-24">
        <p className="text-gray-800 font-medium">Text box</p>
      </div>

      {/* Image Box */}
      <div className="bg-gray-200 rounded-lg mb-4 flex items-center justify-center h-96">
        <p className="text-gray-800 font-medium">Image box</p>
      </div>

      {/* Comments Section */}
      <div className="bg-gray-100 rounded-lg p-4">
        <p className="text-sm text-gray-600 mb-3">Comments 8</p>

        {/* Comment Item */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-gray-300 rounded-full overflow-hidden flex-shrink-0">
            {/* Comment user avatar */}
          </div>
          <div className="bg-gray-200 rounded-lg px-4 py-2 flex-1">
            <p className="text-sm text-gray-800">Text hello world</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4 mt-4">
        {/* Send/Share Button */}
        <button className="p-2 hover:bg-gray-100 rounded-lg">
          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>

        {/* Bookmark Button */}
        <button className="p-2 hover:bg-gray-100 rounded-lg">
          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
          </svg>
        </button>

        {/* Like Button */}
        <button className="p-2 hover:bg-gray-100 rounded-lg">
          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}
