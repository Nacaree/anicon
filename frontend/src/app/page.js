"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { useSidebar } from "@/context/SidebarContext";

const FeaturedEvents = dynamic(
  () => import("@/components/FeaturedEvents"),
  {
    ssr: false,
    loading: () => (
      <div className="mb-8 animate-pulse">
        {/* Section Header */}
        <div className="flex items-baseline justify-between mb-4">
          <Skeleton className="h-6 w-40 rounded" />
          <Skeleton className="h-4 w-20 rounded" />
        </div>
        {/* Carousel Container */}
        <div className="relative rounded-xl overflow-hidden p-6 bg-gray-200 h-48 sm:h-56 md:h-72">
          <div className="flex gap-4 overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-xl h-40 sm:h-48 md:h-64 w-full sm:w-100 md:w-125 lg:w-150 bg-gray-300/50 shrink-0" />
            ))}
          </div>
        </div>
      </div>
    ),
  }
);

const EventSections = dynamic(
  () => import("@/components/EventSections"),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-8 animate-pulse">
        {/* Two carousel sections */}
        {[...Array(2)].map((_, s) => (
          <section key={s}>
            <Skeleton className="h-6 w-44 rounded mb-4" />
            <div className="flex gap-4 overflow-hidden">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-xl h-50 w-64 sm:w-72 lg:w-80 bg-gray-200 shrink-0" />
              ))}
            </div>
          </section>
        ))}
      </div>
    ),
  }
);

const PostCard = dynamic(
  () => import("@/components/PostCard"),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white rounded-xl border border-gray-200 p-3 mb-3 w-full max-w-full sm:max-w-2xl lg:max-w-3xl mx-auto animate-pulse">
        {/* User Header */}
        <div className="flex items-center gap-3 mb-2">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div>
            <Skeleton className="h-4 w-24 rounded mb-1" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
        </div>
        {/* Text */}
        <div className="p-1 mb-2 space-y-2">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-3/4 rounded" />
        </div>
        {/* Image */}
        <Skeleton className="rounded-lg mb-3 h-80 sm:h-96 lg:h-128" />
        {/* Action Buttons */}
        <div className="flex justify-between gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="flex gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <Skeleton className="w-10 h-10 rounded-lg" />
          </div>
        </div>
      </div>
    ),
  }
);

const RightPanel = dynamic(
  () => import("@/components/RightPanel"),
  {
    ssr: false,
    loading: () => (
      <aside className="w-80 space-y-6 sticky top-20 self-start animate-pulse">
        {/* Creator Profile Card */}
        <div className="bg-white rounded-xl px-6 pt-0 pb-6 border border-gray-200">
          {/* Banner */}
          <Skeleton className="rounded-t-xl h-25 -mx-6 mb-3" />
          {/* Profile pic placeholder */}
          <div className="relative">
            <Skeleton className="w-24 h-24 rounded-full absolute -top-14 left-0 border-4 border-white" />
          </div>
          <div className="pt-10 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-28 rounded" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-4 w-40 rounded" />
            <div className="flex items-center gap-2 pt-1">
              <Skeleton className="w-4 h-4 rounded-full" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
            <Skeleton className="h-10 w-full rounded-full mt-2" />
          </div>
        </div>

        {/* Trending Now */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <Skeleton className="h-5 w-28 rounded mb-4" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="pb-3 border-b border-gray-100 last:border-0">
                <Skeleton className="h-4 w-32 rounded mb-1" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Users */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <Skeleton className="h-5 w-36 rounded mb-4" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-20 rounded mb-1" />
                  <Skeleton className="h-3 w-24 rounded" />
                </div>
                <Skeleton className="h-8 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </aside>
    ),
  }
);

export default function Home() {
  const { isSidebarCollapsed } = useSidebar();
  // Incremented by the "anicon-home-refresh" custom event dispatched from Header
  // when the user clicks the logo while already on the homepage.
  // Passing this as `key` to FeaturedEvents and EventSections forces React to
  // unmount + remount them, re-running their useEffect data fetches.
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handler = () => setRefreshKey((k) => k + 1);
    window.addEventListener("anicon-home-refresh", handler);
    return () => window.removeEventListener("anicon-home-refresh", handler);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />

      {/* Content Wrapper - respects sidebar offset */}
      <div
        className={`${
          isSidebarCollapsed ? "md:ml-20" : "md:ml-64"
        } pt-16 transition-all duration-300`}
      >
        {/* Featured Events - Full Width Section */}
        <section className="w-full px-4 sm:px-6 md:px-8 pt-4 pb-8">
          <FeaturedEvents key={refreshKey} />
        </section>

        {/* Main Content + Right Panel Row */}
        <div className="flex flex-col xl:flex-row gap-6 px-4 sm:px-6 md:px-8 pb-8">
          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            <EventSections key={refreshKey} />

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
