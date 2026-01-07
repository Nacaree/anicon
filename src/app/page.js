"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import FeaturedEvents from "@/components/FeaturedEvents";
import EventSections from "@/components/EventSections";
import RightPanel from "@/components/RightPanel";
import PostCard from "@/components/PostCard";

export default function Home() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar isCollapsed={isSidebarCollapsed} />

      {/* Header */}
      <Header toggleSidebar={toggleSidebar} />

      {/* Main Content Area */}
      <main
        className={`${
          isSidebarCollapsed ? "ml-28" : "ml-72"
        } mr-8 pt-20 px-8 pb-8 transition-all duration-300`}
      >
        <FeaturedEvents />
        <EventSections />

        {/* Social Feed */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Posts</h2>
          <PostCard />
          <PostCard />
        </div>
      </main>

      {/* Right Panel */}
      <RightPanel />
    </div>
  );
}
