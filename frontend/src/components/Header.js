"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAuthGate } from "@/context/AuthGateContext";
import { useSidebar } from "@/context/SidebarContext";
import ProfileDropdown from "@/components/ProfileDropdown";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Header() {
  const pathname = usePathname();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [spinnerState, setSpinnerState] = useState("hidden"); // 'hidden', 'showing', 'visible', 'hiding'
  const { isAuthenticated, isLoading } = useAuth();
  const { requireAuth } = useAuthGate();
  const { toggleSidebar } = useSidebar();

  // On the homepage, fire a custom event that page.js listens to in order to
  // remount FeaturedEvents + EventSections and re-fetch their data.
  // A custom event is used so Header doesn't need to own or pass down any state —
  // page.js handles the remount via a refreshKey passed as `key` to those components.
  const handleLogoClick = (e) => {
    if (pathname === "/") {
      e.preventDefault();
      if (isRefreshing) return;

      setIsRefreshing(true);
      setSpinnerState("showing");
      setTimeout(() => setSpinnerState("visible"), 10);

      window.scrollTo({ top: 0, behavior: "smooth" });
      window.dispatchEvent(new CustomEvent("anicon-home-refresh"));

      setTimeout(() => {
        setSpinnerState("hiding"); // Trigger fade-out
        // After animation, hide and allow re-triggering
        setTimeout(() => {
          setSpinnerState("hidden");
          setIsRefreshing(false);
        }, 300); // Corresponds to duration-300
      }, 700);
    }
  };

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
      <Link href="/" onClick={handleLogoClick} className="mr-3 sm:mr-4 md:mr-6">
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

      {/* Refresh spinner — fixed at top-center, fades in when logo is clicked on homepage */}
      {spinnerState !== "hidden" && (
        <div
          className={`fixed top-28 left-0 right-0 flex justify-center z-[100] pointer-events-none
            transition-all duration-300 ease-out
            ${spinnerState === "visible" ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}
        >
          <div className="bg-white rounded-full p-2 shadow-md">
            <svg
              className="w-8 h-8 text-[#FF7927] animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Search Bar — hidden on mobile to free space for notification/profile icons */}
      <div className="hidden sm:block flex-1 max-w-xl mr-auto">
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
        {isLoading ? (
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-gray-200 animate-pulse" />
          </Avatar>
        ) : isAuthenticated ? (
          <>
            {/* Notification bell with dropdown */}
            <NotificationDropdown />

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
              className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-full font-medium hover:bg-primary/90 transition-colors"
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
