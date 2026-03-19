'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthGate } from '@/context/AuthGateContext';
import { creatorApi } from '@/lib/api';
import Image from 'next/image';

/**
 * Facebook-style lightbox for portfolio images.
 * Layout: centered modal with dark image area on the left, info panel on the right.
 * Header has like (heart) + share buttons instead of image counter.
 * Supports keyboard navigation (left/right arrows, Escape to close).
 */
export function PortfolioLightbox({ items, currentIndex, onClose, onChange, onLikeChange }) {
  const item = items[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < items.length - 1;
  const { requireAuth } = useAuthGate();

  // Like state — reset when navigating between items
  const [liked, setLiked] = useState(item?.likedByCurrentUser ?? false);
  const [likeCount, setLikeCount] = useState(item?.likeCount ?? 0);
  // Brief heart animation on double-click (Instagram-style)
  const [showHeartAnim, setShowHeartAnim] = useState(false);

  // Sync like state when switching items
  useEffect(() => {
    setLiked(item?.likedByCurrentUser ?? false);
    setLikeCount(item?.likeCount ?? 0);
  }, [item?.id]);

  // Toggle like (used by heart button — toggles on/off)
  const handleLike = () => {
    requireAuth(async () => {
      const newLiked = !liked;
      const newCount = newLiked ? likeCount + 1 : likeCount - 1;
      setLiked(newLiked);
      setLikeCount(newCount);

      try {
        if (newLiked) {
          await creatorApi.likePortfolioItem(item.id);
        } else {
          await creatorApi.unlikePortfolioItem(item.id);
        }
        onLikeChange?.(item.id, newLiked, newCount);
      } catch (err) {
        console.error('Like failed:', err);
        setLiked(!newLiked);
        setLikeCount(newLiked ? newCount - 1 : newCount + 1);
      }
    });
  };

  // Instagram-style double-click on image — only likes, never unlikes
  const handleDoubleClick = () => {
    // Show heart animation regardless (even if already liked)
    setShowHeartAnim(true);
    setTimeout(() => setShowHeartAnim(false), 800);

    if (liked) return; // Already liked — just show the animation
    requireAuth(async () => {
      const newCount = likeCount + 1;
      setLiked(true);
      setLikeCount(newCount);

      try {
        await creatorApi.likePortfolioItem(item.id);
        onLikeChange?.(item.id, true, newCount);
      } catch (err) {
        console.error('Like failed:', err);
        setLiked(false);
        setLikeCount(newCount - 1);
      }
    });
  };

  const goNext = useCallback(() => {
    if (hasNext) onChange(currentIndex + 1);
  }, [hasNext, currentIndex, onChange]);

  const goPrev = useCallback(() => {
    if (hasPrev) onChange(currentIndex - 1);
  }, [hasPrev, currentIndex, onChange]);

  // Keyboard navigation and body scroll lock
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose, goNext, goPrev]);

  return (
    /* Backdrop — clicking closes the lightbox */
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-6 animate-in fade-in-0 duration-200"
      onClick={onClose}
    >
      {/* Modal container — fixed height so layout is consistent regardless of image aspect ratio */}
      <div
        className="relative flex flex-col md:flex-row w-full max-w-5xl h-[90vh] md:h-[80vh] rounded-xl overflow-hidden shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: dark image area */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-w-0 overflow-hidden">
          {/* Close button — visible on mobile only (desktop has it in the right panel) */}
          <button
            onClick={onClose}
            className="md:hidden absolute top-3 left-3 text-white/70 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Previous arrow */}
          {hasPrev && (
            <button
              onClick={goPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-3 md:p-1.5 rounded-full bg-black/30 hover:bg-white/10 transition-colors z-10"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Next arrow */}
          {hasNext && (
            <button
              onClick={goNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-3 md:p-1.5 rounded-full bg-black/30 hover:bg-white/10 transition-colors z-10"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Image — double-click to like (Instagram-style) */}
          <Image
            src={item.imageUrl}
            alt={item.title || 'Portfolio item'}
            width={1200}
            height={1200}
            className="max-w-full max-h-full object-contain select-none"
            onDoubleClick={handleDoubleClick}
            draggable={false}
            priority
          />

          {/* Heart burst animation on double-click — orange gradient to red */}
          {showHeartAnim && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <svg className="w-20 h-20 drop-shadow-lg animate-heart-burst" viewBox="0 0 24 24" fill="none">
                <defs>
                  <linearGradient id="heart-burst-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FF7927" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                </defs>
                <path
                  d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
                  fill="url(#heart-burst-gradient)"
                  stroke="url(#heart-burst-gradient)"
                  strokeWidth="1"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Right: info panel — stacks below image on mobile, side panel on desktop */}
        <div className="flex flex-col w-full md:w-72 bg-white border-t md:border-t-0 md:border-l border-gray-200 shrink-0 max-h-[30vh] md:max-h-none overflow-y-auto">
          {/* Header — like, share, and close buttons */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Like / heart button */}
              <button
                onClick={handleLike}
                className="flex items-center gap-1.5 text-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <svg className="w-5 h-5 transition-colors" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path
                    d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
                    fill={liked ? '#ef4444' : 'none'}
                    stroke={liked ? '#ef4444' : '#9ca3af'}
                  />
                </svg>
                {likeCount > 0 && (
                  <span className={`text-xs font-medium ${liked ? 'text-red-500' : 'text-gray-400'}`}>
                    {likeCount}
                  </span>
                )}
              </button>

            </div>

            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content — view only */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {item.title && (
              <h3 className="font-semibold text-base text-gray-900 mb-2">{item.title}</h3>
            )}
            {item.characterName && (
              <p className="text-gray-500 text-sm">
                {item.characterName}
                {item.seriesName && ` — ${item.seriesName}`}
              </p>
            )}
            {item.description && (
              <p className="text-gray-600 text-sm mt-3 leading-relaxed">{item.description}</p>
            )}
            {item.category && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {item.category.split(',').map(tag => (
                  <span key={tag} className="inline-block text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                    {tag.trim().replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            )}

            {!item.title && !item.characterName && !item.description && (
              <p className="text-gray-400 text-sm">No details added.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
