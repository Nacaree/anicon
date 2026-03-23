"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAuthGate } from "@/context/AuthGateContext";
import { canCreateMiniEvent } from "@/lib/roles";

/**
 * Instagram-style bottom navigation bar for mobile.
 * Fixed at the bottom of the screen, hidden on desktop (md:hidden).
 * Replaces the sidebar hamburger drawer on mobile for instant one-tap navigation.
 */
export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, profile } = useAuth();
  const { requireAuth } = useAuthGate();

  // Check if a route is active (exact match for home, startsWith for others)
  const isActive = (href) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  // Role-gated create button — eligible users go to /host/create, fans go to /become-host
  const handleCreate = () => {
    requireAuth(() => {
      if (canCreateMiniEvent(profile?.roles)) {
        router.push("/host/create");
      } else {
        router.push("/become-host");
      }
    });
  };

  const activeColor = "text-[#FF7927]";
  const inactiveColor = "text-gray-500";

  return (
    <nav className="fixed bottom-0 inset-x-0 h-14 bg-white border-t border-gray-200 z-50 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around h-full max-w-lg mx-auto">
        {/* Home */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center w-12 h-12 ${isActive("/") ? activeColor : inactiveColor}`}
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
        </Link>

        {/* Events */}
        <Link
          href="/events"
          className={`flex flex-col items-center justify-center w-12 h-12 ${isActive("/events") ? activeColor : inactiveColor}`}
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
              clipRule="evenodd"
            />
          </svg>
        </Link>

        {/* Tickets */}
        <Link
          href="/tickets"
          className={`flex flex-col items-center justify-center w-12 h-12 ${isActive("/tickets") ? activeColor : inactiveColor}`}
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 100-4V6z" />
          </svg>
        </Link>

        {/* Create Event — role-gated: eligible users → /host/create, fans → /become-host */}
        <button
          onClick={handleCreate}
          className={`flex flex-col items-center justify-center w-12 h-12 ${
            isActive("/host/create") || isActive("/become-host") ? activeColor : inactiveColor
          }`}
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
