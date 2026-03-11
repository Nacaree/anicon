// localStorage utility for saved/bookmarked events.
// Stores a JSON array of event ID strings under a single key.
// Used by EventsPageCard (to persist the Save button state) and
// the tickets page Saved tab (to display the saved events list).

const KEY = "anicon_saved_events";

/** Returns a Set of all saved event IDs. Safe to call during SSR — returns empty Set if localStorage is unavailable. */
export function getSavedEventIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || "[]"));
  } catch {
    return new Set();
  }
}

/** Adds an event ID to the saved set and persists to localStorage. */
export function saveEvent(id) {
  const ids = getSavedEventIds();
  ids.add(id);
  localStorage.setItem(KEY, JSON.stringify([...ids]));
}

/** Removes an event ID from the saved set and persists to localStorage. */
export function unsaveEvent(id) {
  const ids = getSavedEventIds();
  ids.delete(id);
  localStorage.setItem(KEY, JSON.stringify([...ids]));
}

/** Returns true if the event ID is currently saved. */
export function isEventSaved(id) {
  return getSavedEventIds().has(id);
}
