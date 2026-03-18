// Badge displayed on event cards and detail pages for mini-events (community meetups).
// Uses purple to visually distinguish from the orange brand color and price indicators.
export function MiniEventBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
      Community Meetup
    </span>
  );
}
