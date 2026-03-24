'use client';

import { useState, useEffect } from 'react';
import { userEventsApi } from '@/lib/api';
import EventCard from '@/components/events/EventCard';

/**
 * Grid of events the user is attending (RSVP'd or bought tickets).
 * Splits into "Going to" and "Went to" sections based on event date.
 */
export function EventsGoingSection({ userId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userEventsApi.getGoingEvents(userId)
      .then(setEvents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="text-3xl mb-2">🎫</div>
        <p>No events yet</p>
      </div>
    );
  }

  // Split events into upcoming vs past by comparing event date to today
  const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
  const upcoming = events.filter(e => e.eventDate >= today);
  const past = events.filter(e => e.eventDate < today);

  return (
    <div className="space-y-8">
      {upcoming.length > 0 && (
        <EventGroup label="Going to" events={upcoming} />
      )}
      {past.length > 0 && (
        <EventGroup label="Went to" events={past} />
      )}
    </div>
  );
}

/** Labeled grid of event cards */
function EventGroup({ label, events }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
        {label} ({events.length})
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map(event => (
          // Wrapper overrides EventCard's fixed carousel widths so it fills the grid cell
          <div key={event.id} className="[&>a>div]:w-full [&>a]:block">
            <EventCard
              id={event.id}
              title={event.title}
              date={formatDate(event.eventDate)}
              location={event.location}
              imageUrl={event.coverImageUrl}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Format ISO date string to readable short date */
function formatDate(isoDate) {
  if (!isoDate) return '';
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
