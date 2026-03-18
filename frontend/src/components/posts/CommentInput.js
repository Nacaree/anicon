"use client";

import { useState } from "react";
import { Send } from "lucide-react";

/**
 * Text input for adding comments or replies.
 * Shows a character counter near the limit and a send button.
 */
export default function CommentInput({ placeholder = "Write a comment...", onSubmit, autoFocus = false }) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = text.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit(text.trim());
      setText("");
    } catch (err) {
      console.error("Failed to submit comment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    // Submit on Enter (not Shift+Enter for multiline)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={text}
        onChange={(e) => {
          if (e.target.value.length <= 500) setText(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
      />
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="p-2 rounded-full text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
