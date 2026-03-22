"use client";

import Link from "next/link";

/**
 * Renders post text with #hashtags highlighted in orange and clickable.
 * Clicking a hashtag navigates to search results for that tag.
 * Splits text on hashtag boundaries, preserving whitespace and line breaks.
 */
export default function HashtagText({ text, className = "" }) {
  if (!text) return null;

  // Split text into segments: plain text and #hashtags
  const parts = text.split(/(#\w+)/g);

  return (
    <p className={`whitespace-pre-wrap break-words ${className}`}>
      {parts.map((part, i) =>
        /^#\w+$/.test(part) ? (
          <Link
            key={i}
            href={`/search?q=${encodeURIComponent(part)}&tab=posts`}
            onClick={(e) => e.stopPropagation()}
            className="text-orange-500 hover:text-orange-600 hover:underline font-medium"
          >
            {part}
          </Link>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}
