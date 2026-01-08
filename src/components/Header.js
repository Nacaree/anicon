import Image from "next/image";

export default function Header({ toggleSidebar }) {
  return (
    <header className="h-16 bg-white border-b border-transparent fixed top-0 left-0 right-0 z-50 flex items-center px-6">
      {/* Hamburger Menu Button */}
      <button
        onClick={toggleSidebar}
        className="p-2 hover:bg-gray-100 rounded-full mr-5"
      >
        <svg
          className="w-6 h-6 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Logo */}
      <div className="mr-6">
        <Image
          src="/logo.svg"
          alt="ANIKON Logo"
          width={80}
          height={40}
          className="object-contain"
          priority
        />
      </div>

      {/* Search Bar */}
      <div className="flex-1 max-w-xl mr-auto">
        <div className="relative">
          <input
            type="text"
            placeholder="Search"
            className="w-full px-4 py-2 pl-10 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7927]"
          />
          <svg
            className="w-5 h-5 text-gray-400 absolute left-3 top-2.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Right Side Icons */}
      <div className="flex items-center gap-4 ml-6">
        {/* Post Button */}
        <button className="flex items-center gap-2 bg-[#FF7927] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#E66B1F]">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          Post
        </button>

        {/* Mail Icon */}
        <button className="p-2 hover:bg-gray-100 rounded-full">
          <svg
            className="w-5 h-5 text-gray-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
          </svg>
        </button>

        {/* Notification Icon */}
        <button className="p-2 hover:bg-gray-100 rounded-full">
          <svg
            className="w-5 h-5 text-gray-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
          </svg>
        </button>

        {/* User Avatar */}
        <button className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-medium">👤</span>
        </button>
      </div>
    </header>
  );
}
