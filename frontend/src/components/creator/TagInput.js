'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

/**
 * Free-form tag input. Type a tag and press Enter or comma to add it as a chip.
 * Tags are stored as an array and converted to/from comma-separated strings for the DB.
 */
export function TagInput({ tags = [], onChange }) {
  const [input, setInput] = useState('');

  const addTag = (raw) => {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, '_');
    if (!tag || tags.includes(tag)) return;
    onChange([...tags, tag]);
  };

  const removeTag = (tagToRemove) => {
    onChange(tags.filter(t => t !== tagToRemove));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
      setInput('');
    }
    // Backspace on empty input removes the last tag
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2">Tags (optional)</p>
      <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border bg-background min-h-[38px] focus-within:ring-2 focus-within:ring-primary/50">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#FF7927] text-white"
          >
            {tag.replace(/_/g, ' ')}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? 'Type a tag and press Enter' : ''}
          className="flex-1 min-w-[100px] text-sm bg-transparent outline-none"
        />
      </div>
    </div>
  );
}

// Convert comma-separated category string to tags array
export function categoryToTags(category) {
  if (!category) return [];
  return category.split(',').map(t => t.trim()).filter(Boolean);
}

// Convert tags array to comma-separated category string
export function tagsToCategory(tags) {
  return tags.length > 0 ? tags.join(',') : null;
}
