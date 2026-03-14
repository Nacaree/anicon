'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Trash2, Pencil } from 'lucide-react';
import Image from 'next/image';

// Single portfolio gallery item with hover menu for owner actions
export function PortfolioCard({ item, isOwner = false, onDelete, onEdit, onClick }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setConfirmDelete(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  return (
    <div className="group relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer" onClick={onClick}>
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

      {/* 3-dot menu for owner — stopPropagation prevents opening the lightbox */}
      {isOwner && (
        <div
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
          ref={menuRef}
        >
          <button
            onClick={() => { setMenuOpen(!menuOpen); setConfirmDelete(false); }}
            className="bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Dropdown menu */}
          {menuOpen && (
            <div className="absolute top-9 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[120px] z-10">
              {confirmDelete ? (
                <>
                  <p className="px-3 py-1.5 text-xs text-gray-500">Are you sure?</p>
                  <button
                    onClick={() => { onDelete(); setMenuOpen(false); }}
                    className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Confirm delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="w-full text-left px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { onEdit?.(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
