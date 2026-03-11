# EventCarousel — Enlarge Animation Design Notes

> Session log covering the design decisions for the `enableEnlarge` feature in `EventCarousel.js`.

---

## What It Does

When `enableEnlarge` is passed to `<EventCarousel>`, the card closest to the left edge of the scroll container is visually "featured" — it grows wider and slightly taller than its neighbors, giving a podium-style prominence effect. As the user scrolls, the featured card transitions to the next closest card with a smooth animation.

---

## Why Width/Height Animation (Not `transform: scale` or `zoom`)

### `transform: scale(1.1)` — Rejected (blur on 1× DPR)

`transform: scale()` rasterizes the element at its natural CSS pixel size and then upscales the GPU texture. On a 1× DPR display (1080p), every CSS pixel equals one device pixel, so scaling 1.1× means the GPU upscales a 1:1 texture — visibly blurry. On 2× DPR (4K Retina), the 2:1 texture upscaled 1.1× still looks sharp, so the blur was only noticeable on 1080p monitors.

Additionally, `transition-all` on the card itself (before it was changed to `transition-[box-shadow,opacity,translate]`) included the `scale` CSS property. Chrome pre-promotes elements with `transition: scale` defined to a separate GPU compositing sub-layer at 1× CSS size. When the parent then applied `scale(1.1)`, that sub-layer was upscaled — causing a visible ~300ms blur on hover before Chrome repromoted the layer. Fix: change card transition to `transition-[box-shadow,opacity,translate]` (exclude `scale` and `filter`).

### `zoom: 1.1` — Rejected (CSS transition not reliable)

CSS `zoom` renders at the actual displayed size (no GPU upscaling) — always sharp at any DPR. However, `transition: zoom` set via `el.style.transition` was not reliably animated by the browser. Setting transition and zoom in the same JS synchronous tick gets batched; the browser applies both at once with no "before" state. Various workarounds (`getBoundingClientRect()` reflow flush, double-rAF) didn't resolve it. A manual rAF animation loop did work, but `zoom` also causes `items-end` bottom-anchoring to shift text upward during animation (zoom scales from top-left while the bottom stays fixed), which looked wrong.

### Width + Height Layout Animation — Chosen

Directly animating `el.style.width` and `el.style.height` (and the card child's width/height) via a `requestAnimationFrame` loop:

- **No blur** — the card renders at its final physical size on every frame.
- **Smooth** — rAF bypasses CSS transition batching issues entirely.
- **Layout-aware** — changing `width` in the flex container naturally pushes neighboring cards aside (no overlap).
- **Height grows upward** — because the container uses `items-end`, cards are bottom-aligned. A taller card expands upward, which looks natural.

---

## Animation Implementation

```js
const ENLARGE_W_SCALE = 1.2;   // 20% wider
const ENLARGE_H_SCALE = 1.05;  // 5% taller (subtle podium pop)
const ENLARGE_DURATION = 300;  // ms

const easeOut = (t) => 1 - (1 - t) * (1 - t);

function animateEnlarge(el, wScale, hScale) {
  if (el._enlargeRaf) cancelAnimationFrame(el._enlargeRaf);

  // Cache natural size on first call — BoundingClientRect reflects animated size,
  // so we must store originals to avoid drift across mid-animation restarts.
  if (!el._naturalW) el._naturalW = el.getBoundingClientRect().width;
  if (!el._naturalH) el._naturalH = el.getBoundingClientRect().height;

  const fromW = el.getBoundingClientRect().width;  // current (may be mid-animation)
  const toW = el._naturalW * wScale;
  // ... animate both el and el.firstElementChild (the EventsPageCard root div)
}
```

Key details:
- `el._naturalW` / `el._naturalH` are cached as DOM properties on first call. This ensures fast scroll (many `applyEnlarge` calls per second) doesn't drift the natural size.
- `el.firstElementChild.style.width/height` is set alongside the wrapper so the card's image and content fill the new size (otherwise the card stays `w-56` and the wrapper is just empty space around it).
- When de-enlarging completes (`wScale <= 1 && hScale <= 1`), inline styles are cleared so Tailwind classes resume control.

---

## Scroll-Triggered Enlarge Detection

```js
const handleScroll = () => {
  // rAF-debounce: only the last position per animation frame matters
  if (rafRef.current) cancelAnimationFrame(rafRef.current);
  rafRef.current = requestAnimationFrame(() => {
    const snapPoint = containerRect.left + 24; // left edge + px-4 padding + buffer
    // Find card whose left edge is closest to the snap point
    let closestIndex = 0;
    itemRefs.current.forEach((el, index) => {
      const diff = Math.abs(el.getBoundingClientRect().left - snapPoint);
      if (diff < minDiff) { minDiff = diff; closestIndex = index; }
    });
    applyEnlarge(closestIndex);
  });
};
```

---

## Container Layout

When `enableEnlarge` is active the scroll container uses:

```
items-end px-4 pb-4 pt-10 h-104
```

- `items-end` — bottom-aligns all cards so the enlarged card rises upward.
- `pt-10` — enough clearance at the top for the tallest enlarged card.
- `h-104` — fixed height so the section doesn't reflow as cards grow.

---

## Hover Scale on Non-Enlarged Cards

Non-enlarged cards keep `hover:scale-[1.05]` via a Tailwind class on the wrapper div. The enlarged card has this class removed (`newEl.classList.remove("hover:scale-[1.05]")`). `transformOrigin: "center bottom"` is set so hover scale expands cards upward from their center base — consistent with the enlarge direction.

`transition-transform duration-300 ease-out` provides the smooth hover animation. Importantly, this only transitions `transform` — not `scale`, `filter`, or other properties — so Chrome does not pre-promote the wrapper to a GPU sub-layer at 1× pixel density, which was the root cause of the earlier hover-triggered blur.

---

## Usage

```jsx
// Enlarge enabled (EventsCategorySection):
<EventCarousel enableEnlarge>
  {events.map(e => <EventsPageCard key={e.id} event={e} />)}
</EventCarousel>

// Plain carousel (FeaturedEvents, EventSections):
<EventCarousel autoPlay>
  {cards}
</EventCarousel>
```
