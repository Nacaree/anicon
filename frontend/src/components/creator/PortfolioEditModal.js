'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { TagInput, categoryToTags, tagsToCategory } from './TagInput';

// Modal for editing an existing portfolio item's metadata (title, tag, description)
export function PortfolioEditModal({ item, onClose, onSave }) {
  const [title, setTitle] = useState(item.title || '');
  const [description, setDescription] = useState(item.description || '');
  const [tags, setTags] = useState(categoryToTags(item.category));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await onSave(item.id, {
        imageUrl: item.imageUrl,
        title: title || null,
        description: description || null,
        category: tagsToCategory(tags),
      });
      onClose();
    } catch (err) {
      console.error('Save failed:', err);
      setError(err.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in-0 duration-200" onClick={onClose}>
      <div className="bg-background rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl animate-in fade-in-0 zoom-in-95 duration-200 transition-[height] duration-300 ease-out" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Edit Portfolio Item</h3>
          <button onClick={onClose} className="flex items-center justify-center w-8 h-8 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Image preview (not editable — just for reference) */}
          <div className="relative h-48 rounded-lg overflow-hidden bg-muted">
            <Image
              src={item.imageUrl}
              alt={item.title || 'Portfolio item'}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 400px"
            />
          </div>

          {/* Title */}
          <input
            type="text"
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />

          {/* Custom tag input — type a tag and press Enter to add */}
          <TagInput tags={tags} onChange={setTags} />

          {/* Description */}
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
          />

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          {/* Save */}
          <Button
            type="submit"
            disabled={saving}
            className="w-full rounded-full hover:scale-[1.01] active:scale-[0.98] transition-all duration-300 hover:shadow-[0_4px_20px_rgba(255,121,39,0.4)]"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
