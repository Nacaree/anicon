export default function Sidebar({ isCollapsed, isMobileMenuOpen, closeMobileMenu }) {
  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300
        ${isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={closeMobileMenu}
      ></div>

      {/* Sidebar */}
      <div
        className={`${
          isCollapsed ? "w-64 md:w-20" : "w-64"
        } bg-white h-screen fixed left-0 top-16 flex-col py-4 border-transparent transition-all duration-300 z-50 flex
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        {/* Navigation Menu */}
        <nav className="flex flex-col gap-2 w-full px-2">
        {/* Home - Active */}
        <a
          href="#"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg bg-[#FF7927] text-white ${
            isCollapsed ? "md:justify-center" : ""
          }`}
        >
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
          <span className={`text-sm font-medium ${isCollapsed ? "md:hidden" : ""}`}>Home</span>
        </a>

        {/* Events */}
        <a
          href="#"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 ${
            isCollapsed ? "md:justify-center" : ""
          }`}
        >
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
              clipRule="evenodd"
            />
          </svg>
          <span className={`text-sm font-medium ${isCollapsed ? "md:hidden" : ""}`}>Events</span>
        </a>

        {/* Tickets */}
        <a
          href="#"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 ${
            isCollapsed ? "md:justify-center" : ""
          }`}
        >
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 100-4V6z" />
          </svg>
          <span className={`text-sm font-medium ${isCollapsed ? "md:hidden" : ""}`}>Tickets</span>
        </a>
      </nav>
    </div>
    </>
  );
}
