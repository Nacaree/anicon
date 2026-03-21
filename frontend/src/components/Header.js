"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAuthGate } from "@/context/AuthGateContext";
import { useSidebar } from "@/context/SidebarContext";
import ProfileDropdown from "@/components/ProfileDropdown";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";
import SearchDropdown from "@/components/search/SearchDropdown";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [spinnerState, setSpinnerState] = useState("hidden"); // 'hidden', 'showing', 'visible', 'hiding'
  const { isAuthenticated, isLoading } = useAuth();
  const { requireAuth } = useAuthGate();
  const { toggleSidebar } = useSidebar();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const searchContainerRef = useRef(null);
  const desktopSearchInputRef = useRef(null);
  const mobileSearchInputRef = useRef(null);

  // Close dropdown when clicking outside the search container
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-focus the mobile search input when the overlay opens
  useEffect(() => {
    if (showMobileSearch && mobileSearchInputRef.current) {
      mobileSearchInputRef.current.focus();
    }
  }, [showMobileSearch]);

  // Global "/" hotkey to focus search bar (like Facebook/GitHub)
  // Skips when the user is already typing in an input, textarea, or contentEditable
  useEffect(() => {
    function handleSlashKey(e) {
      if (e.key !== "/") return;
      const tag = e.target.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        e.target.isContentEditable
      ) return;

      e.preventDefault();
      // On desktop (sm+), focus the search input directly
      if (desktopSearchInputRef.current) {
        desktopSearchInputRef.current.focus();
      } else {
        // On mobile, open the overlay (which auto-focuses its input)
        setShowMobileSearch(true);
      }
    }
    document.addEventListener("keydown", handleSlashKey);
    return () => document.removeEventListener("keydown", handleSlashKey);
  }, []);

  // Shared keyboard handler for both desktop and mobile search inputs
  const handleSearchKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        setShowDropdown(false);
        setShowMobileSearch(false);
        e.target.blur();
      }
      if (e.key === "Enter" && searchQuery.trim()) {
        setShowDropdown(false);
        setShowMobileSearch(false);
        router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      }
    },
    [searchQuery, router],
  );

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setShowDropdown(true);
  };

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

  // Reusable search icon SVG path
  const searchIconPath = (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  );

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
      <Link
        href="/"
        onClick={handleLogoClick}
        className="mr-3 sm:mr-4 md:mr-6"
      >
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

      {/* Desktop Search Bar — hidden on mobile to free space for notification/profile icons */}
      <div
        ref={searchContainerRef}
        className="hidden sm:block flex-1 max-w-xl mr-auto relative"
      >
        <div className="relative">
          <input
            ref={desktopSearchInputRef}
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => {
              if (searchQuery.trim().length >= 2) setShowDropdown(true);
            }}
            onKeyDown={handleSearchKeyDown}
            className="w-full px-3 sm:px-4 py-2 pl-9 sm:pl-10 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7927]"
          />
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 absolute left-2 sm:left-3 top-2.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {searchIconPath}
          </svg>
        </div>
        {/* Instant search dropdown — appears below the input when query >= 2 chars */}
        {showDropdown && searchQuery.trim().length >= 2 && (
          <SearchDropdown
            query={searchQuery.trim()}
            onClose={() => setShowDropdown(false)}
          />
        )}
      </div>

      {/* Mobile Search Icon — visible on small screens only */}
      <button
        onClick={() => setShowMobileSearch(true)}
        className="sm:hidden p-2 hover:bg-gray-100 rounded-full transition-colors mr-auto"
      >
        <svg
          className="w-5 h-5 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {searchIconPath}
        </svg>
      </button>

      {/* Mobile Search Overlay — full-width bar replacing the header on small screens */}
      {showMobileSearch && (
        <div className="fixed inset-x-0 top-0 h-16 bg-white z-60 flex items-center px-3 gap-2 border-b sm:hidden">
          {/* Back/close button */}
          <button
            onClick={() => {
              setShowMobileSearch(false);
              setSearchQuery("");
              setShowDropdown(false);
            }}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div className="flex-1 relative">
            <input
              ref={mobileSearchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search"
              className="w-full px-3 py-2 pl-9 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7927]"
            />
            <svg
              className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {searchIconPath}
            </svg>
            {/* Dropdown renders below the mobile input */}
            {showDropdown && searchQuery.trim().length >= 2 && (
              <SearchDropdown
                query={searchQuery.trim()}
                onClose={() => {
                  setShowDropdown(false);
                  setShowMobileSearch(false);
                }}
              />
            )}
          </div>
        </div>
      )}

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
