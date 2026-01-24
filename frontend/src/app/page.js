"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import FeaturedEvents from "@/components/FeaturedEvents";
import EventSections from "@/components/EventSections";
import RightPanel from "@/components/RightPanel";
import PostCard from "@/components/PostCard";

export default function Home() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and window resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const toggleSidebar = () => {
    // On mobile, toggle mobile menu. On desktop, toggle collapsed state
    if (isMobile) {
      setIsMobileMenuOpen(!isMobileMenuOpen);
    } else {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    }
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        isMobileMenuOpen={isMobileMenuOpen}
        closeMobileMenu={closeMobileMenu}
      />

      {/* Header */}
      <Header toggleSidebar={toggleSidebar} />

      {/* Content Wrapper - respects sidebar offset */}
      <div
        className={`${
          isSidebarCollapsed ? "md:ml-20" : "md:ml-64"
        } pt-16 transition-all duration-300`}
      >
        {/* Featured Events - Full Width Section */}
        <section className="w-full px-4 sm:px-6 md:px-8 pt-4 pb-8">
          <FeaturedEvents />
        </section>

        {/* Main Content + Right Panel Row */}
        <div className="flex flex-col xl:flex-row gap-6 px-4 sm:px-6 md:px-8 pb-8">
          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            <EventSections />

            {/* Social Feed */}
            <div className="mt-8">
              {/* <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Posts</h2> */}
              <PostCard
                username="Anime Power"
                handle="AniPower"
                text="Just finished watching the latest episode! The animation quality was absolutely stunning. What did everyone think about that plot twist at the end? 🔥"
                imageUrl="https://kotaku.com/app/uploads/2024/10/1df1fae5c38114dc21e6d062b62dd270.jpg"
                avatarUrl="https://media.istockphoto.com/id/1470987836/photo/portrait-of-a-beautiful-young-woman-game-cosplay-with-samurai-dress-costume-on-japanese-garden.jpg?s=612x612&w=0&k=20&c=NGfgu3Ti5DH1o7ZNLq1Jj069HyZ-hlprCbrbRP7JDNI="
              />
              <PostCard
                username="Otaku Dreams"
                handle="OtakuDreams"
                text="Can't wait for the next convention! Already planning my cosplay. Who else is going? Let's meet up! 🎭✨"
                imageUrl="https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800"
                avatarUrl="https://images.unsplash.com/photo-1613376023733-0a73315d9b06?w=400&h=400&fit=crop"
              />
              <PostCard
                username="Manga Fanatic"
                handle="MangaFan"
                text="Just picked up the latest volume! The character development in this arc is incredible. Highly recommend checking it out! 📚"
                imageUrl="https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=800"
                avatarUrl="https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&h=400&fit=crop"
              />
              <PostCard
                username="Cosplay Queen"
                handle="CosplayQueen"
                text="Finished my new cosplay just in time for the weekend event! So excited to debut it. What do you all think? 👑💫"
                imageUrl="https://images.unsplash.com/photo-1613376023733-0a73315d9b06?w=800"
                avatarUrl="https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&h=400&fit=crop"
              />
              <PostCard
                username="Anime Critic"
                handle="AnimeCritic"
                text="This season's lineup is absolutely fire! So many great shows to watch. What's everyone's top 3 this season? 🌟"
                imageUrl="https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800"
                avatarUrl="https://kotaku.com/app/uploads/2024/10/1df1fae5c38114dc21e6d062b62dd270.jpg"
              />
            </div>
          </main>

          {/* Right Panel */}
          <aside className="w-full xl:w-80 flex-shrink-0 hidden xl:block">
            <RightPanel />
          </aside>
        </div>
      </div>
    </div>
  );
}
