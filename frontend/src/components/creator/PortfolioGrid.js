'use client';

import { useState, useEffect } from 'react';
import { creatorApi } from '@/lib/api';
import { PortfolioCard } from './PortfolioCard';
import { PortfolioLightbox } from './PortfolioLightbox';
import { PortfolioEditModal } from './PortfolioEditModal';
import { PortfolioUploadModal } from './PortfolioUploadModal';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Displays a user's portfolio as a responsive grid with optional upload/delete for owners
export function PortfolioGrid({ userId, isOwner = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const loadPortfolio = async () => {
    try {
      const data = await creatorApi.getPortfolio(userId);
      setItems(data);
    } catch (err) {
      console.error('Failed to load portfolio:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolio();
  }, [userId]);

  const handleDelete = async (id) => {
    try {
      await creatorApi.deletePortfolioItem(id);
      setItems(items.filter(item => item.id !== id));
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  // Update portfolio item metadata from the edit modal
  const handleUpdate = async (id, data) => {
    await creatorApi.updatePortfolioItem(id, data);
    // Update local state so changes are reflected immediately
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...data } : i));
  };

  const handleUploadSuccess = () => {
    setShowUpload(false);
    loadPortfolio();
  };

  // Sync like state from lightbox back to items array so reopening shows correct state
  const handleLikeChange = (itemId, liked, newCount) => {
    setItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, likedByCurrentUser: liked, likeCount: newCount } : i
    ));
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Header with Add button */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Portfolio</h2>
        {isOwner && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUpload(true)}
            className="rounded-full gap-1 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        )}
      </div>

      {/* Grid */}
      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {isOwner ? 'Add your first portfolio item!' : 'No portfolio items yet.'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {(expanded ? items : items.slice(0, 8)).map((item, index) => (
              <PortfolioCard
                key={item.id}
                item={item}
                isOwner={isOwner}
                onDelete={() => handleDelete(item.id)}
                onEdit={() => setEditItem(item)}
                onClick={() => setLightboxIndex(index)}
              />
            ))}
          </div>
          {/* Show more / Show less toggle when there are more than 8 items (2 rows on desktop) */}
          {items.length > 8 && (
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {expanded ? 'Show less' : `Show all ${items.length} items`}
              </button>
            </div>
          )}
        </>
      )}

      {/* Lightbox — fullscreen image viewer with prev/next navigation */}
      {lightboxIndex !== null && (
        <PortfolioLightbox
          items={items}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={(i) => setLightboxIndex(i)}
          onLikeChange={handleLikeChange}
        />
      )}

      {/* Edit Modal — standalone modal for editing item metadata */}
      {editItem && (
        <PortfolioEditModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSave={handleUpdate}
        />
      )}

      {/* Upload Modal */}
      {showUpload && (
        <PortfolioUploadModal
          userId={userId}
          onClose={() => setShowUpload(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
}
