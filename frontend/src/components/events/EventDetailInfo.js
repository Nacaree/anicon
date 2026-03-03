"use client";

import { useState, useEffect, useRef } from "react";

export default function EventDetailInfo({ event, loading = false }) {
  const [isVisible, setIsVisible] = useState(false);
  const detailsRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.2 },
    );

    if (detailsRef.current) observer.observe(detailsRef.current);
    return () => observer.disconnect();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse">
        {/* Date + Title */}
        <div className="mb-3">
          <div className="h-4 w-28 bg-gray-200 rounded mb-2" />
          <div className="h-7 w-64 bg-gray-200 rounded" />
        </div>
        {/* Location */}
        <div className="h-4 w-44 bg-gray-200 rounded mb-3" />
        {/* Tags */}
        <div className="flex gap-1.5 mb-4">
          <div className="h-6 w-16 bg-gray-200 rounded-full" />
          <div className="h-6 w-20 bg-gray-200 rounded-full" />
          <div className="h-6 w-18 bg-gray-200 rounded-full" />
        </div>
        {/* Description */}
        <div className="space-y-2 mb-6">
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-3/4 bg-gray-200 rounded" />
        </div>
        {/* Details Card */}
        <div className="h-5 w-20 bg-gray-200 rounded mb-3" />
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3 max-w-md">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-4 bg-gray-200 rounded"
              style={{ width: `${65 + i * 5}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Date + Title + Actions Row */}
      <div className="mb-3">
        <p className="text-sm text-[#FF7927] font-semibold mb-1">
          {event.date}, {event.time}
        </p>

        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          {event.title}
        </h1>
      </div>

      {/* Location */}
      <p className="text-sm text-gray-500 flex items-center gap-1 mb-3">
        <svg
          className="w-4 h-4 text-[#FF7927] flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
            clipRule="evenodd"
          />
        </svg>
        {event.location}
      </p>

      {/* Tags */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {event.tags?.map((tag) => (
          <span
            key={tag}
            className="text-xs bg-white border border-gray-200 px-3 py-1 rounded-full text-gray-500"
          >
            #{tag}
          </span>
        ))}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 leading-relaxed mb-6">
        {event.description}
      </p>

      {/* Details Card */}
      <div
        ref={detailsRef}
        className={`transition-all duration-700 ease-out ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      >
        <h2 className="text-lg font-bold text-gray-900 mb-3">Details</h2>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3 max-w-md">
          {/* Status */}
          <div className="text-sm text-gray-600">
            Event Status:{" "}
            <span className="text-green-500 font-medium">Active</span>
            {" / "}
            <span className="text-red-500 font-medium">Ended</span>
          </div>

          {/* Price */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg
              className="w-4 h-4 text-gray-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            $ {event.ticketPrice?.toFixed(2)} per Ticket
          </div>

          {/* Location Link */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg
              className="w-4 h-4 text-gray-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {event.locationUrl}
          </div>

          {/* Time */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg
              className="w-4 h-4 text-gray-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {event.timeRange}
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg
              className="w-4 h-4 text-gray-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {event.dateRange}
          </div>
        </div>
      </div>
    </div>
  );
}
