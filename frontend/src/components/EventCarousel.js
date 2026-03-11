"use client";

import { useRef, useState, useEffect, Children } from "react";

// How much wider the enlarged card is relative to its natural width.
const ENLARGE_SCALE = 1.2;
const ENLARGE_DURATION = 300; // ms

// Ease-out curve: fast start, slow finish.
const easeOut = (t) => 1 - (1 - t) * (1 - t);

// Animate the wrapper's width+height (and its direct card child's) from current to
// natural * toScale. The wrapper expanding in layout pushes neighboring cards aside.
// el._naturalW / el._naturalH are cached on first call so mid-animation restarts work.
function animateEnlarge(el, toScale) {
  if (el._enlargeRaf) cancelAnimationFrame(el._enlargeRaf);
  const rect = el.getBoundingClientRect();
  if (!el._naturalW) el._naturalW = rect.width;
  if (!el._naturalH) el._naturalH = rect.height;
  const fromW = rect.width;
  const fromH = rect.height;
  const toW = el._naturalW * toScale;
  const toH = el._naturalH * toScale;
  const cardEl = el.firstElementChild; // the EventsPageCard root div
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min((now - start) / ENLARGE_DURATION, 1);
    const w = fromW + (toW - fromW) * easeOut(t);
    const h = fromH + (toH - fromH) * easeOut(t);
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    if (cardEl) { cardEl.style.width = `${w}px`; cardEl.style.height = `${h}px`; }
    if (t < 1) {
      el._enlargeRaf = requestAnimationFrame(tick);
    } else {
      el._enlargeRaf = null;
      if (toScale <= 1) {
        el.style.width = ""; el.style.height = "";
        if (cardEl) { cardEl.style.width = ""; cardEl.style.height = ""; }
      }
    }
  };
  el._enlargeRaf = requestAnimationFrame(tick);
}

export default function EventCarousel({
  children,
  hideGradients = false,
  enableEnlarge = false,
  // autoPlay: advances the carousel automatically on an interval, pauses on hover
  autoPlay = false,
  autoPlayInterval = 4000,
}) {
  const scrollContainerRef = useRef(null);
  const [showButtons, setShowButtons] = useState(false);
  const [showLeftGradient, setShowLeftGradient] = useState(false);
  const [showRightGradient, setShowRightGradient] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Per-item wrapper refs — DOM-mutated directly so no React re-render fires on scroll.
  const itemRefs = useRef([]);
  const enlargedIndexRef = useRef(0);
  const rafRef = useRef(null);

  // Direct DOM mutation: apply or remove the enlarged visual state by widening the card.
  // Only width grows — height stays fixed so text never shifts vertically.
  const applyEnlarge = (newIndex, animated = true) => {
    if (!enableEnlarge) return;
    const prevIndex = enlargedIndexRef.current;

    if (prevIndex !== newIndex) {
      const prevEl = itemRefs.current[prevIndex];
      if (prevEl) {
        if (animated) {
          animateEnlarge(prevEl, 1);
        } else {
          if (prevEl._enlargeRaf) cancelAnimationFrame(prevEl._enlargeRaf);
          prevEl.style.width = ""; prevEl.style.height = "";
          const prevCard = prevEl.firstElementChild;
          if (prevCard) { prevCard.style.width = ""; prevCard.style.height = ""; }
        }
        // Restore hover scale now that this card is no longer the featured one.
        prevEl.classList.add("hover:scale-[1.05]");
      }
    }

    const newEl = itemRefs.current[newIndex];
    if (newEl) {
      if (animated) {
        animateEnlarge(newEl, ENLARGE_SCALE);
      } else {
        if (newEl._enlargeRaf) cancelAnimationFrame(newEl._enlargeRaf);
        const newRect = newEl.getBoundingClientRect();
        if (!newEl._naturalW) newEl._naturalW = newRect.width;
        if (!newEl._naturalH) newEl._naturalH = newRect.height;
        const w = newEl._naturalW * ENLARGE_SCALE;
        const h = newEl._naturalH * ENLARGE_SCALE;
        newEl.style.width = `${w}px`; newEl.style.height = `${h}px`;
        const newCard = newEl.firstElementChild;
        if (newCard) { newCard.style.width = `${w}px`; newCard.style.height = `${h}px`; }
      }
      // Suppress hover scale — card is already enlarged and visually prominent.
      newEl.classList.remove("hover:scale-[1.05]");
    }

    enlargedIndexRef.current = newIndex;
  };

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftGradient(scrollLeft > 5);
    setShowRightGradient(scrollLeft < scrollWidth - clientWidth - 5);

    if (!enableEnlarge) return;

    // Cancel any pending frame — only the last scroll position in a frame matters.
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const containerRect = container.getBoundingClientRect();
      const snapPoint = containerRect.left + 24;
      let minDiff = Infinity;
      let closestIndex = 0;
      itemRefs.current.forEach((el, index) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const diff = Math.abs(rect.left - snapPoint);
        if (diff < minDiff) { minDiff = diff; closestIndex = index; }
      });
      applyEnlarge(closestIndex);
    });
  };

  useEffect(() => {
    setIsMounted(true);
    const container = scrollContainerRef.current;
    if (!container) return;

    handleScroll();

    if (enableEnlarge) {
      // Snap first card to enlarged width immediately on first paint (no animation).
      applyEnlarge(0, false);
      // Restore hover transition after initial paint so hover:scale animates.
      requestAnimationFrame(() => {
        itemRefs.current.forEach((el) => { if (el) el.style.transition = HOVER_TRANSITION; });
      });
    }

    container.addEventListener("scroll", handleScroll);
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-play: advance one item per interval, loop back at end. Pauses on hover.
  useEffect(() => {
    if (!autoPlay || showButtons) return;
    const id = setInterval(() => {
      const container = scrollContainerRef.current;
      if (!container) return;
      const { scrollLeft, scrollWidth, clientWidth } = container;
      const atEnd = scrollLeft >= scrollWidth - clientWidth - 5;
      if (atEnd) {
        container.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        const sampleItem = itemRefs.current[0];
        const scrollAmount = sampleItem ? sampleItem.offsetWidth + 28 : clientWidth * 0.5;
        container.scrollTo({ left: scrollLeft + scrollAmount, behavior: "smooth" });
      }
    }, autoPlayInterval);
    return () => clearInterval(id);
  }, [autoPlay, autoPlayInterval, showButtons]);

  // Reset enlargement when children change (e.g. EventTimeline tab filter).
  const childCount = Children.count(children);
  const prevChildCount = useRef(childCount);
  useEffect(() => {
    if (prevChildCount.current === childCount) return;
    itemRefs.current.forEach((el) => {
      if (!el) return;
      if (el._enlargeRaf) cancelAnimationFrame(el._enlargeRaf);
      el.style.width = ""; el.style.height = "";
      el._naturalW = null; el._naturalH = null;
      const card = el.firstElementChild;
      if (card) { card.style.width = ""; card.style.height = ""; }
      el.classList.add("hover:scale-[1.05]");
    });
    enlargedIndexRef.current = 0;
    if (enableEnlarge) {
      applyEnlarge(0, false);
      requestAnimationFrame(() => {
        itemRefs.current.forEach((el) => { if (el) el.style.transition = HOVER_TRANSITION; });
      });
    }
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ left: 0 });
    prevChildCount.current = childCount;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childCount]);

  const scroll = (direction) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    // Sample the second item (the first may have extra z-index/transform state).
    const sampleItem = itemRefs.current[1] || itemRefs.current[0];
    let scrollAmount;
    if (sampleItem) {
      const gap = 28; // gap-7
      const stride = sampleItem.offsetWidth + gap;
      scrollAmount = Math.max(1, Math.floor(container.clientWidth / stride)) * stride;
    } else {
      scrollAmount = container.offsetWidth * 0.8;
    }
    container.scrollTo({
      left: direction === "left" ? container.scrollLeft - scrollAmount : container.scrollLeft + scrollAmount,
      behavior: "smooth",
    });
  };

  const renderChildren = () =>
    Children.map(children, (child, index) => (
      // Each child gets a wrapper div that owns hover/enlarge transforms.
      // center-bottom origin so hover:scale-[1.05] expands upward from center.
      // Transition is set via el.style.transition (not a CSS class) so scroll-triggered
      // enlarges share the same timing curve as CSS hover transitions.
      <div
        key={index}
        ref={(el) => (itemRefs.current[index] = el)}
        className="shrink-0 hover:scale-[1.05] hover:z-5"
        style={{ transformOrigin: "center bottom" }}
      >
        {child}
      </div>
    ));

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowButtons(true)}
      onMouseLeave={() => setShowButtons(false)}
    >
      {!hideGradients && isMounted && (
        <>
          {/* Left fade mask — visible when scrolled away from the start */}
          <div
            className={`absolute left-0 top-0 bottom-0 w-20 z-5 pointer-events-none transition-opacity duration-300 ${
              showLeftGradient ? "opacity-100" : "opacity-0"
            }`}
            style={{ background: "linear-gradient(to right, rgba(249,250,251,0.85) 0%, transparent 100%)" }}
          />
          {/* Right fade mask — visible when there is more content to the right */}
          <div
            className={`absolute right-0 top-0 bottom-0 w-20 z-5 pointer-events-none transition-opacity duration-300 ${
              showRightGradient ? "opacity-100" : "opacity-0"
            }`}
            style={{ background: "linear-gradient(to left, rgba(249,250,251,0.85) 0%, transparent 100%)" }}
          />
        </>
      )}

      {/* Native horizontal scroll container. scroll-smooth enables CSS smooth scrolling
          for programmatic scrollTo() calls (buttons, autoplay). scrollbar-hide hides the
          scrollbar visually while keeping the scroll interaction intact. */}
      <div
        ref={scrollContainerRef}
        className={`flex gap-7 overflow-x-auto scrollbar-hide scroll-smooth rounded-xl ${
          enableEnlarge ? "items-end px-4 pb-4 pt-10 h-104" : "p-4"
        }`}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {renderChildren()}
      </div>

      {/* Left navigation button */}
      {isMounted && (
        <button
          onClick={() => scroll("left")}
          className={`absolute left-1 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center transition-opacity duration-300 hover:bg-gray-50 -ml-5 ${
            showButtons ? "opacity-100" : "opacity-0"
          }`}
          aria-label="Scroll left"
        >
          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Right navigation button */}
      {isMounted && (
        <button
          onClick={() => scroll("right")}
          className={`absolute right-1 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center transition-opacity duration-300 hover:bg-gray-50 -mr-5 ${
            showButtons ? "opacity-100" : "opacity-0"
          }`}
          aria-label="Scroll right"
        >
          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}
