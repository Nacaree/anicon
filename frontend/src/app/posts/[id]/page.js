"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import PostDetail from "@/components/posts/PostDetail";
import { useSidebar } from "@/context/SidebarContext";

/**
 * Dedicated post detail page — rendered for direct links to /posts/[id].
 * Shows the full post with comments. Same content as PostDetailModal but
 * as a standalone page instead of an overlay.
 */
export default function PostDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isSidebarCollapsed } = useSidebar();

  const handlePostDeleted = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <Header />

      <div
        className={`${
          isSidebarCollapsed ? "md:ml-20" : "md:ml-64"
        } pt-16 transition-all duration-300`}
      >
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {/* Post detail + comments */}
          <PostDetail postId={id} onPostDeleted={handlePostDeleted} />
        </div>
      </div>
    </div>
  );
}
