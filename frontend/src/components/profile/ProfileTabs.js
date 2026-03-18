'use client';

import { useState } from 'react';
import { HomeTab } from './HomeTab';
import { EventsTab } from './EventsTab';

// Maps tab name → 0-based index for the sliding underline offset.
// 2 tabs: indicator is w-1/2 and translates by 100% per step.
const TAB_INDEX = { home: 0, events: 1 };
const TABS = [
  { key: 'home', label: 'Home' },
  { key: 'events', label: 'Events' },
];

/**
 * Tab container for the bottom section of the profile page.
 * Home tab is a placeholder for future posts; Events tab shows going/hosted events.
 * Uses a sliding underline indicator matching the tickets page animation style.
 */
export function ProfileTabs({ profile, isOwner }) {
  const [activeTab, setActiveTab] = useState('home');
  // Lazy mount: EventsTab is only rendered after the user clicks the Events tab once.
  // This prevents its API calls from firing on initial profile page load.
  const [hasActivatedEvents, setHasActivatedEvents] = useState(false);

  return (
    <div className="mt-8">
      {/* Tab headers with sliding underline indicator */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="relative inline-flex">
          {/* Sliding underline — translates horizontally to follow the active tab */}
          <div
            className="absolute bottom-0 h-0.5 w-1/2 bg-[#FF7927] transition-transform duration-300 ease-in-out"
            style={{
              transform: `translateX(${TAB_INDEX[activeTab] * 100}%)`,
            }}
          />
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                if (tab.key === 'events') setHasActivatedEvents(true);
              }}
              className={`w-24 pb-3 text-sm font-semibold transition-colors duration-300 ${
                activeTab === tab.key
                  ? 'text-[#FF7927]'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content — both tabs stay mounted to avoid refetching on tab switch.
         * Hidden tab uses display:none so its state (scroll position, loaded posts) is preserved.
         * EventsTab uses hasActivated to defer its initial fetch until the user clicks "Events". */}
      <div className="py-6">
        <div style={{ display: activeTab === 'home' ? 'block' : 'none' }}>
          <HomeTab profile={profile} isOwner={isOwner} />
        </div>
        <div style={{ display: activeTab === 'events' ? 'block' : 'none' }}>
          {hasActivatedEvents && <EventsTab profile={profile} />}
        </div>
      </div>
    </div>
  );
}
