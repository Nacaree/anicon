"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertCircle, X } from "lucide-react";

/**
 * Global error toast that listens for "anicon-error" custom events
 * dispatched by the API layer (api.js) and displays a user-friendly
 * snackbar at the top of the screen. Auto-dismisses after 4 seconds.
 *
 * Mounted once in providers.js — no need to add it per page.
 */
export default function GlobalErrorToast() {
  const [error, setError] = useState(null);
  const [visible, setVisible] = useState(false);

  const dismiss = useCallback(() => {
    setVisible(false);
    // Wait for fade-out animation before clearing the message
    setTimeout(() => setError(null), 200);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const message = e.detail?.message;
      if (!message) return;

      setError(message);
      setVisible(true);
    };

    window.addEventListener("anicon-error", handler);
    return () => window.removeEventListener("anicon-error", handler);
  }, []);

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(dismiss, 4000);
    return () => clearTimeout(timer);
  }, [visible, dismiss]);

  if (!error) return null;

  return (
    <div
      className={`fixed top-6 left-1/2 -translate-x-1/2 z-100 transition-all duration-300 ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-2 pointer-events-none"
      }`}
    >
      <div className="flex items-center gap-2.5 bg-red-500 text-white pl-3.5 pr-2 py-2.5 rounded-full shadow-[0_4px_20px_rgba(239,68,68,0.4)]">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span className="text-sm font-medium">{error}</span>
        <button
          onClick={dismiss}
          className="p-1 rounded-full hover:bg-white/20 transition-colors ml-1"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
