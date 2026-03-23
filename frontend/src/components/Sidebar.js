"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/context/AuthContext";
import { canCreateMiniEvent } from "@/lib/roles";

export default function Sidebar() {
  const pathname = usePathname();
  const { isSidebarCollapsed: isCollapsed } = useSidebar();
  const { profile } = useAuth();

  // Determine whether to show "Host" (can create events) or "Become a Host" (fan)
  const roles = profile?.roles || [];
  const canHost = canCreateMiniEvent(roles);

  const navItems = [
    {
      label: "Home",
      href: "/",
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
        </svg>
      ),
    },
    {
      label: "Events",
      href: "/events",
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      label: "Tickets",
      href: "/tickets",
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 100-4V6z" />
        </svg>
      ),
    },
    // "Host" for users who can create events, "Become a Host" for fans.
    // Only shown when the user is logged in.
    ...(profile ? [{
      label: canHost ? "Host" : "Become a Host",
      href: canHost ? "/host/create" : "/become-host",
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
        </svg>
      ),
    }] : []),
  ];

  return (
      <div
        className={`${
          isCollapsed ? "w-64 md:w-20" : "w-64"
        } bg-white h-screen fixed left-0 top-16 flex-col py-4 border-transparent transition-all duration-300 z-50 hidden md:flex overflow-hidden`}
      >
        {/* Navigation Menu */}
        <nav className={`flex flex-col gap-2 w-full px-2 transition-all duration-300 ${isCollapsed ? "md:px-[14px]" : ""}`}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg overflow-hidden transition-colors ${
                  isActive
                    ? "bg-[#FF7927] text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {item.icon}
                <span className={`text-sm font-medium whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? "md:opacity-0" : ""}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
  );
}
