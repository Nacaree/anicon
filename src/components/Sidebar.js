export default function Sidebar() {
  return (
    <div className="w-28 bg-white h-screen fixed left-0 top-0 flex flex-col items-center py-4 border-r border-gray-200">
      {/* Logo */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          <span className="text-orange-500">ANI</span>
          <span className="text-orange-500">KON</span>
        </h1>
      </div>

      {/* Navigation Menu */}
      <nav className="flex flex-col gap-4 w-full px-2">
        {/* Home - Active */}
        <a
          href="#"
          className="flex flex-col items-center gap-1 px-4 py-3 rounded-lg bg-orange-500 text-white"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
          <span className="text-xs">Home</span>
        </a>

        {/* Events */}
        <a
          href="#"
          className="flex flex-col items-center gap-1 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
          <span className="text-xs">Events</span>
        </a>

        {/* Tickets */}
        <a
          href="#"
          className="flex flex-col items-center gap-1 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 100-4V6z" />
          </svg>
          <span className="text-xs">Tickets</span>
        </a>
      </nav>
    </div>
  );
}
