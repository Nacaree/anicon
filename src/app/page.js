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

      {/* Content Wrapper - respects sidebar offset */}
      <div
        className={`${
          isSidebarCollapsed ? "ml-20" : "ml-64"
        } pt-16 transition-all duration-300`}
      >
        {/* Featured Events - Full Width Section */}
        <section className="w-full px-8 pt-4 pb-8">
          <FeaturedEvents />
        </section>

        {/* Main Content + Right Panel Row */}
        <div className="flex gap-6 px-8 pb-8">
          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            <EventSections />

            {/* Social Feed */}
            <div className="mt-8">
              {/* <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Posts</h2> */}
              <PostCard />
              <PostCard />
              <PostCard />
              <PostCard />
              <PostCard />
              <PostCard />
              <PostCard />
              <PostCard />
            </div>
          </main>

          {/* Right Panel */}
          <aside className="w-80 flex-shrink-0">
            <RightPanel />
          </aside>
        </div>
      </div>
    </div>
  );
}
