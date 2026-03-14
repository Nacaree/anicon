'use client';

import { useState } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { creatorApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';

const TAGS = ['cosplay', 'digital_art', 'traditional', 'craft', 'commission_sample'];

// Modal for uploading a new portfolio item with image + metadata
export function PortfolioUploadModal({ userId, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Basic validation: images only, max 10MB
    if (!selected.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB');
      return;
    }

    setFile(selected);
    setError(null);
    // Generate a local preview URL
    setPreview(URL.createObjectURL(selected));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select an image');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // 1. Upload image to Supabase Storage
      const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const path = `${userId}/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from('portfolio')
        .upload(path, file);

      if (uploadError) throw uploadError;

      // 2. Get the public URL for the uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from('portfolio')
        .getPublicUrl(path);

      // 3. Create portfolio item via backend API
      await creatorApi.addPortfolioItem({
        imageUrl: publicUrl,
        title: title || null,
        description: description || null,
        category: category || null,
      });

      onSuccess();
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Add Portfolio Item</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Image upload area */}
          {preview ? (
            <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => { setFile(null); setPreview(null); }}
                className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 cursor-pointer hover:border-primary/50 transition-colors">
              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">Click to upload image</span>
              <span className="text-xs text-muted-foreground mt-1">Max 10MB</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          )}

          {/* Title */}
          <input
            type="text"
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />

          {/* Tag chips — select one category */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Tag (optional)</p>
            <div className="flex flex-wrap gap-2">
              {TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setCategory(category === tag ? '' : tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-[1.02] active:scale-[0.98] ${
                    category === tag
                      ? 'bg-[#FF7927] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tag.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

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

          {/* Submit */}
          <Button
            type="submit"
            disabled={uploading || !file}
            className="w-full hover:scale-[1.02] active:scale-[0.98] transition-all hover:shadow-[0_4px_20px_rgba(255,121,39,0.4)]"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              'Add to Portfolio'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
