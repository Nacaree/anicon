"use client";

import { useState, useEffect, useRef } from "react";
import { useAuthGate } from "@/context/AuthGateContext";

export default function EventTicketCard({ event }) {
  const { requireAuth } = useAuthGate();
  const [copied, setCopied] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.2 }
    );

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  };

  return (
    <div
      ref={cardRef}
      className={`transition-all duration-700 ease-out ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-6"
      }`}
    >
      <h2 className="text-lg font-bold text-gray-900 mb-3">
        Grab Your Tickets
      </h2>

      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        {/* Price */}
        <p className="text-2xl font-bold text-gray-900 mb-1">
          $ {event.ticketPrice?.toFixed(2)}
        </p>

        {/* Date Range */}
        <p className="text-sm text-[#FF7927] font-medium mb-4">
          {event.dateRange}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => requireAuth(() => {
              // TODO: handle ticket purchase
            })}
            className="flex-1 bg-[#FF7927] hover:bg-[#E66B1F] text-white font-semibold py-3 rounded-full
              transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_4px_20px_rgba(255,121,39,0.4)]
              active:scale-[0.98]"
          >
            Get Tickets
          </button>

          <button
            onClick={handleCopyLink}
            className="relative flex-shrink-0 w-12 h-12 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full
              transition-all duration-300 hover:scale-[1.08] active:scale-[0.95]"
          >
            {copied ? (
              <svg
                className="w-5 h-5 text-green-500 transition-all duration-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-gray-500 transition-all duration-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            )}

            {/* Copied toast */}
            <span
              className={`absolute -top-9 left-1/2 -translate-x-1/2 text-xs font-medium bg-gray-900 text-white px-2.5 py-1 rounded-lg whitespace-nowrap
                transition-all duration-300 ${
                  copied
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-2 pointer-events-none"
                }`}
            >
              Link copied!
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
