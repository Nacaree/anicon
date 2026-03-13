'use client';

import { useState } from 'react';
import { HomeTab } from './HomeTab';
import { EventsTab } from './EventsTab';

/**
 * Tab container for the bottom section of the profile page.
 * Home tab is a placeholder for future posts; Events tab shows going/hosted events.
 */
export function ProfileTabs({ profile, isOwner }) {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className="mt-8">
      {/* Tab headers */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('home')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'home'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Home
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'events'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Events
        </button>
      </div>

      {/* Tab content */}
      <div className="py-6">
        {activeTab === 'home' && <HomeTab profile={profile} isOwner={isOwner} />}
        {activeTab === 'events' && <EventsTab profile={profile} />}
      </div>
    </div>
  );
}
