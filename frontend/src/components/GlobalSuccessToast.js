"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle, X } from "lucide-react";

/**
 * Global success toast that listens for "anicon-success" custom events
 * and displays a green snackbar at the top of the screen.
 * Auto-dismisses after 4 seconds.
 *
 * Mounted once in providers.js — no need to add it per page.
 */
export default function GlobalSuccessToast() {
  const [message, setMessage] = useState(null);
  const [visible, setVisible] = useState(false);

  const dismiss = useCallback(() => {
    setVisible(false);
    // Wait for fade-out animation before clearing the message
    setTimeout(() => setMessage(null), 200);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const msg = e.detail?.message;
      if (!msg) return;

      setMessage(msg);
      setVisible(true);
    };

    window.addEventListener("anicon-success", handler);
    return () => window.removeEventListener("anicon-success", handler);
  }, []);

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(dismiss, 4000);
    return () => clearTimeout(timer);
  }, [visible, dismiss]);

  if (!message) return null;

  return (
    <div
      className={`fixed top-6 left-1/2 -translate-x-1/2 z-100 transition-all duration-300 ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-2 pointer-events-none"
      }`}
    >
      <div className="flex items-center gap-2.5 bg-green-500 text-white pl-3.5 pr-2 py-2.5 rounded-full shadow-[0_4px_20px_rgba(34,197,94,0.4)]">
        <CheckCircle className="w-4 h-4 shrink-0" />
        <span className="text-sm font-medium">{message}</span>
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
