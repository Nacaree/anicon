'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import Image from 'next/image';

/**
 * Facebook-style lightbox for portfolio images.
 * Layout: centered modal with dark image area on the left, info panel on the right.
 * Owner can edit title, description, character, series, and category inline.
 * Supports keyboard navigation (left/right arrows, Escape to close).
 */
export function PortfolioLightbox({ items, currentIndex, onClose, onChange, isOwner = false, onUpdate, initialEditing = false }) {
  const item = items[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < items.length - 1;

  const [editing, setEditing] = useState(initialEditing);
  const [form, setForm] = useState({});

  // Reset edit state when switching images
  useEffect(() => {
    setEditing(false);
    setForm({
      title: item.title || '',
      description: item.description || '',
      characterName: item.characterName || '',
      seriesName: item.seriesName || '',
      category: item.category || '',
    });
  }, [currentIndex, item]);

  const goNext = useCallback(() => {
    if (hasNext) onChange(currentIndex + 1);
  }, [hasNext, currentIndex, onChange]);

  const goPrev = useCallback(() => {
    if (hasPrev) onChange(currentIndex - 1);
  }, [hasPrev, currentIndex, onChange]);

  const handleSave = async () => {
    if (onUpdate) {
      await onUpdate(item.id, form);
    }
    setEditing(false);
  };

  // Keyboard navigation and body scroll lock (disabled when editing to allow typing)
  useEffect(() => {
    const handleKey = (e) => {
      if (editing) return;
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
  }, [onClose, goNext, goPrev, editing]);

  return (
    /* Backdrop — clicking closes the lightbox */
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
      onClick={onClose}
    >
      {/* Modal container */}
      <div
        className="relative flex w-full max-w-5xl max-h-[85vh] rounded-xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: dark image area */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-w-0">
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
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-1.5 rounded-full bg-black/30 hover:bg-white/10 transition-colors z-10"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Next arrow */}
          {hasNext && (
            <button
              onClick={goNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-1.5 rounded-full bg-black/30 hover:bg-white/10 transition-colors z-10"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Image */}
          <Image
            src={item.imageUrl}
            alt={item.title || 'Portfolio item'}
            width={1200}
            height={1200}
            className="max-w-full max-h-[85vh] object-contain"
            priority
          />
        </div>

        {/* Right: info panel */}
        <div className="hidden md:flex flex-col w-72 bg-white border-l border-gray-200 shrink-0">
          {/* Header — counter, edit/save button, close button */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-400">
              {currentIndex + 1} / {items.length}
            </span>
            <div className="flex items-center gap-1">
              {isOwner && editing && (
                <button
                  onClick={handleSave}
                  className="text-green-600 hover:text-green-700 p-1.5 rounded-full hover:bg-green-50 transition-colors"
                  title="Save"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content — view or edit mode */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {editing ? (
              /* Edit mode */
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Title</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF7927]/30 focus:border-[#FF7927]"
                    placeholder="Title"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Character</label>
                  <input
                    type="text"
                    value={form.characterName}
                    onChange={(e) => setForm({ ...form, characterName: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF7927]/30 focus:border-[#FF7927]"
                    placeholder="Character name"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Series</label>
                  <input
                    type="text"
                    value={form.seriesName}
                    onChange={(e) => setForm({ ...form, seriesName: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF7927]/30 focus:border-[#FF7927]"
                    placeholder="Series name"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Category</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF7927]/30 focus:border-[#FF7927]"
                    placeholder="e.g. cosplay, digital_art"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF7927]/30 focus:border-[#FF7927] resize-none"
                    placeholder="Description"
                  />
                </div>
              </div>
            ) : (
              /* View mode */
              <>
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
                  <span className="inline-block mt-3 text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                    {item.category}
                  </span>
                )}

                {!item.title && !item.characterName && !item.description && (
                  <p className="text-gray-400 text-sm">
                    {isOwner ? 'Click the pencil to add details.' : 'No details added.'}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
