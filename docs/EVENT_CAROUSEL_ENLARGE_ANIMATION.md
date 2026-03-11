# EventCarousel — Enlarge Animation Engineering Notes

## Goal

Cards in `EventsCategorySection` use `enableEnlarge` on `EventCarousel`. The first/closest card should appear visually prominent (enlarged) as the user scrolls. This doc covers all the iterations to get a smooth, sharp, layout-correct enlarge animation.

---

## What was tried and why it failed

### 1. `transform: scale(1.1)` via CSS transition
- **Problem:** Blur on 1× DPR (1080p) monitors. Chrome rasterizes the element at 1× CSS pixel size then upscales the GPU texture 1.1×. On 2× DPR (4K/Retina) the blur is hidden by the device's extra pixels, but on 1080p it's visible.
- **Secondary problem:** `transition-all` on `EventsPageCard` included the `scale` CSS property, which caused Chrome to pre-promote the card to its own compositing layer at 1× size. When the parent wrapper scaled, the already-composited sub-layer was upscaled → blurry flash during hover.

### 2. `zoom: 1.1` via CSS `transition: zoom`
- **Sharpness fix:** `zoom` renders at native resolution (no GPU upscaling), so text and images stay sharp at any DPR.
- **Problem:** CSS `transition: zoom` is unreliable across browser versions. The animation snapped instantly regardless of the transition declaration.
- **Attempted fix 1:** `getBoundingClientRect()` reflow trick to flush styles before setting new zoom value — didn't help for `zoom` specifically.
- **Attempted fix 2:** Setting `zoom: "1"` on all cards at mount so the browser always has a numeric "from" value — didn't help.

### 3. `zoom: 1.1` via manual rAF animation
- **Fix for snapping:** Drive the zoom animation manually with `requestAnimationFrame` instead of CSS transitions. Read `el.style.zoom` as the current value, interpolate to target, update on every frame.
- **New problem:** Text "moved" during animation. With `items-end` layout, the flex container anchors the card's bottom edge. `zoom` scales from the element's top-left corner, so as zoom grows the card expands upward — content appears to drift up.
- **Attempted fix:** Counter-translate with `el.style.translate = "0 Xpx"` (half the extra height) to keep the card's center fixed. Result: bottom of the card sank below the container's bottom padding.

### 4. Width-only animation (current approach)

Dropped `zoom` entirely. Instead, animate only `el.style.width` (and the card child's width) using rAF. Height stays fixed → text never shifts vertically. The wrapper expanding in the flex layout naturally pushes neighboring cards aside.

Later: added height animation as well at user request for a slight 3D feel.

---

## Current Implementation

### Key constants (`EventCarousel.js`)

```js
const ENLARGE_SCALE = 1.2;   // 20% larger in both dimensions
const ENLARGE_DURATION = 300; // ms
const HOVER_TRANSITION = "scale 300ms ease-out"; // for non-enlarged cards' hover
```

### `animateEnlarge(el, toScale)`

- Reads current `getBoundingClientRect()` dimensions at animation start (one reflow, not per frame).
- Caches `el._naturalW` and `el._naturalH` on first call so mid-animation restarts interpolate from correct natural size.
- Animates `el.style.width` + `el.style.height` and their card child equivalents on every rAF tick.
- On de-enlarge completion (`toScale <= 1`), clears all inline width/height so Tailwind classes take over.
- Cancellation: stores rAF id in `el._enlargeRaf`; any new animation cancels the previous one first.

### `applyEnlarge(newIndex, animated)`

- Called from scroll handler (via rAF) to switch which card is enlarged.
- `animated = false` used on mount and tab-filter reset (no transition, snap directly to enlarged size).
- Removes `hover:scale-[1.05]` class from the enlarged card (it's already prominent; hover scale would be redundant).
- Restores `hover:scale-[1.05]` on the previously enlarged card.

### `EventsPageCard.js` fix

Changed `transition-all` → `transition-[box-shadow,opacity,translate]` on the card's root div.

**Why:** `transition-all` caused Chrome to include the CSS `scale` property in the transition set, which triggered early GPU compositing layer promotion for the card at 1× CSS pixel size. When the parent wrapper scaled, the pre-composited sub-layer was upscaled → blurry hover flash. Explicitly listing only `box-shadow`, `opacity`, and `translate` prevents this layer promotion.

---

## Files changed

| File | Change |
|---|---|
| `frontend/src/components/EventCarousel.js` | Enlarge animation: rAF-driven width+height instead of CSS zoom/scale |
| `frontend/src/components/events/EventsPageCard.js` | `transition-all` → `transition-[box-shadow,opacity,translate]` to prevent blur |
