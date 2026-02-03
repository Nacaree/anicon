"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useAuthGate } from "@/context/AuthGateContext";
import ProfileDropdown from "@/components/ProfileDropdown";

export default function Header({ toggleSidebar }) {
  const { isAuthenticated } = useAuth();
  const { requireAuth } = useAuthGate();

  return (
    <header className="h-16 bg-white border-b border-transparent fixed top-0 left-0 right-0 z-50 flex items-center px-3 sm:px-4 md:px-6">
      {/* Hamburger Menu Button */}
      <button
        onClick={toggleSidebar}
        className="p-2 hover:bg-gray-100 rounded-full mr-2 sm:mr-3 md:mr-5 transition-colors"
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
      <Link href="/" className="mr-3 sm:mr-4 md:mr-6">
        <Image
          src="/logo.svg"
          alt="ANIKON Logo"
          width={80}
          height={40}
          className="object-contain hidden sm:block"
          priority
        />
        <Image
          src="/logo.svg"
          alt="ANIKON Logo"
          width={50}
          height={25}
          className="object-contain sm:hidden"
          priority
        />
      </Link>

      {/* Search Bar */}
      <div className="flex-1 max-w-xl mr-auto">
        <div className="relative">
          <input
            type="text"
            placeholder="Search"
            className="w-full px-3 sm:px-4 py-2 pl-9 sm:pl-10 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7927]"
          />
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 absolute left-2 sm:left-3 top-2.5"
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
      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 ml-2 sm:ml-4 md:ml-6">
        {/* Post Button */}
        <button
          onClick={() => requireAuth(() => {})}
          className="flex items-center gap-2 bg-[#FF7927] text-white px-3 sm:px-4 py-2 rounded-full text-sm font-medium hover:bg-[#E66B1F] transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          <span className="hidden sm:inline">Post</span>
        </button>

        {isAuthenticated ? (
          <>
            {/* Notification Icon */}
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <svg
                className="w-5 h-5 text-gray-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
            </button>

            {/* User Avatar & Profile Dropdown */}
            <ProfileDropdown />
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="text-sm text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-sm bg-[#FF7927] text-white px-4 py-2 rounded-full font-medium hover:bg-[#E66B1F] transition-colors"
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
