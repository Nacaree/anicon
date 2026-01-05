import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import FeaturedEvents from '@/components/FeaturedEvents';
import EventSections from '@/components/EventSections';
import RightPanel from '@/components/RightPanel';
import PostCard from '@/components/PostCard';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Header */}
      <Header />

      {/* Main Content Area */}
      <main className="ml-28 mr-72 pt-20 px-8 pb-8">
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
