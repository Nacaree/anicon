# Event Detail Page - Development Log

## Lazy Loading (next/dynamic)

- Replaced timer-based skeleton (`setTimeout` 1.2s) with real lazy loading using `next/dynamic` with `ssr: false`
- Each of the 5 event components is code-split into its own chunk:
  - `EventImageCarousel` — uses shadcn `Skeleton` component
  - `EventDetailInfo` — manual `bg-gray-200` skeleton divs
  - `EventOrganizer` — manual skeleton divs
  - `EventTicketCard` — manual skeleton divs
  - `EventsCategorySection` — manual skeleton divs
- `Sidebar` and `Header` stay as static imports (layout components, should render immediately)
- Each component's skeleton is inlined in the `loading` callback of `next/dynamic`
- To test: Chrome DevTools → Network → Slow 3G → Hard refresh

## shadcn Skeleton

- Installed via `npx shadcn@latest add skeleton` in `/frontend`
- Located at `src/components/ui/skeleton.jsx`
- Changed default color from `bg-accent` to `bg-gray-200` to match existing skeletons
- Currently only used by `EventImageCarousel`; other components still use manual `bg-gray-200 animate-pulse` divs

## Details Section

- Box constrained horizontally with `max-w-md`
- Skeleton fallback also has `max-w-md` to match
- Styling: `bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3`
- Has intersection observer fade-in animation

## Intersection Observer Animations

All these components have scroll-triggered fade-in (`opacity-0 translate-y-6` → `opacity-100 translate-y-0`):
- `EventDetailInfo` (Details card section)
- `EventOrganizer`
- `EventTicketCard`
- `EventsCategorySection` (added this session)

## Event Card Enlargement (Carousel)

### Problem
When the first visible card in the carousel enlarged, it changed height, making the carousel container grow and pushing all content below it down.

### Solution
- **Width**: still changes from `w-56 sm:w-60` → `w-72 sm:w-85` (horizontal scroll handles this fine)
- **Image height**: changes from `h-32 sm:h-36` → `h-44 sm:h-45`
- **Carousel container**: fixed `h-[24rem]` with `items-end` — cards align at the bottom, enlarged card grows upward into pre-reserved space
- **Hover**: non-enlarged cards use `hover:scale-[1.06]` (CSS transform, no layout shift)

### Key files
- `src/components/EventCarousel.js` — container with `h-[24rem] items-end`
- `src/components/events/EventsPageCard.js` — card with conditional width/height

## Related Events

- "You May Also Like" section shows 10 related events (was 4)
- Uses `getRelatedEvents(id, 10)` from `mockEvents.js`

## Files Modified This Session

| File | Changes |
|---|---|
| `src/app/events/[id]/page.js` | Replaced static imports with `next/dynamic`, removed timer loading state, added shadcn Skeleton import, increased related events to 10 |
| `src/components/events/EventImageCarousel.js` | Added shadcn Skeleton for loading state |
| `src/components/events/EventDetailInfo.js` | Added `max-w-md` to Details box and its skeleton |
| `src/components/events/EventsCategorySection.js` | Added intersection observer fade-in animation |
| `src/components/events/EventsPageCard.js` | Changed enlargement from width+height change to fixed-container approach |
| `src/components/EventCarousel.js` | Fixed height `h-[24rem]`, `items-end` alignment for enlarge mode |
| `src/components/ui/skeleton.jsx` | Changed `bg-accent` to `bg-gray-200` |
