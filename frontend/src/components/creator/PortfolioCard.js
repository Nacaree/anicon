'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import Image from 'next/image';

// Single portfolio gallery item with optional delete for the owner
export function PortfolioCard({ item, isOwner = false, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="group relative aspect-square rounded-lg overflow-hidden bg-muted">
      <Image
        src={item.imageUrl}
        alt={item.title || 'Portfolio item'}
        fill
        className="object-cover transition-transform duration-300 group-hover:scale-105"
        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
      />

      {/* Overlay with title/character info on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
        {item.title && (
          <p className="text-white text-sm font-medium truncate">{item.title}</p>
        )}
        {item.characterName && (
          <p className="text-white/70 text-xs truncate">
            {item.characterName}
            {item.seriesName && ` — ${item.seriesName}`}
          </p>
        )}
      </div>

      {/* Featured indicator */}
      {item.isFeatured && (
        <div className="absolute top-2 left-2 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
          Featured
        </div>
      )}

      {/* Delete button for owner */}
      {isOwner && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {confirmDelete ? (
            <div className="flex gap-1">
              <button
                onClick={onDelete}
                className="bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600 transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="bg-muted text-foreground text-xs px-2 py-1 rounded hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="bg-black/50 text-white p-1.5 rounded-full hover:bg-red-500 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
