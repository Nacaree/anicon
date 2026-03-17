'use client';

import { useState } from 'react';
import { isOrganizer, isCreator, canHaveGoingEvents, canHaveHostedEvents } from '@/lib/roles';
import { EventsGoingSection } from './EventsGoingSection';
import { EventsHostedSection } from './EventsHostedSection';

/**
 * Events tab on the profile page with role-based logic:
 * - Fan / Influencer / Creator (no organizer): only "Going" (no sub-tabs)
 * - Organizer (without creator): only "Hosted" (no sub-tabs)
 * - Creator + Organizer: "Going" + "Hosted" sub-tabs
 */
export function EventsTab({ profile }) {
  const roles = profile.roles || [];
  const showGoing = canHaveGoingEvents(roles);
  const showHosted = canHaveHostedEvents(roles);

  // Organizer-only (no creator): show hosted events directly, no tabs needed
  if (showHosted && !showGoing) {
    return <EventsHostedSection userId={profile.id} miniOnly={false} />;
  }

  // Creator+Organizer combo: show sub-tabs for Going and Hosted
  if (showGoing && showHosted) {
    return <EventsSubTabs profile={profile} roles={roles} />;
  }

  // Everyone else (fan, influencer, creator): show going events only
  return <EventsGoingSection userId={profile.id} />;
}

/**
 * Sub-tab switcher for creator+organizer profiles that have both Going and Hosted sections.
 * Separated into its own component so useState is not called conditionally.
 */
function EventsSubTabs({ profile }) {
  const [subTab, setSubTab] = useState('going');

  return (
    <div>
      {/* Sub-tab pills */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSubTab('going')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98] ${
            subTab === 'going'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Going
        </button>
        <button
          onClick={() => setSubTab('hosted')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98] ${
            subTab === 'hosted'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Hosted
        </button>
      </div>

      {/* key forces remount on sub-tab change to trigger fade-in animation */}
      <div key={subTab} className="animate-in fade-in duration-300">
        {subTab === 'going' && <EventsGoingSection userId={profile.id} />}
        {subTab === 'hosted' && <EventsHostedSection userId={profile.id} miniOnly={false} />}
      </div>
    </div>
  );
}
