"use client";

import { useRef } from "react";
import { ImagePlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/**
 * Compact composer trigger bar — shown at top of home feed and profile HomeTab.
 * Clicking the pill opens the modal. Clicking the photo icon opens file picker
 * first, then opens the modal with those files pre-loaded.
 */
export default function PostComposer({ onOpenComposer, onOpenWithImages }) {
  const { profile } = useAuth();
  const fileInputRef = useRef(null);

  const handleImageClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onOpenWithImages?.(files);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3 mb-4 cursor-pointer hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          onClick={onOpenComposer}
          className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0"
        >
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt="Your avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg font-bold">
              {(profile?.displayName || profile?.username || "?")[0].toUpperCase()}
            </div>
          )}
        </div>

        {/* Placeholder text inside a pill — clicking opens modal */}
        <div
          onClick={onOpenComposer}
          className="flex-1 min-w-0 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2.5"
        >
          <span className="text-gray-400 dark:text-gray-500 text-[15px]">
            Share your latest creation...
          </span>
        </div>

        {/* Photo icon — opens file picker only, modal opens after files are chosen */}
        <button
          onClick={handleImageClick}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ImagePlus className="w-5 h-5 text-orange-500" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}
