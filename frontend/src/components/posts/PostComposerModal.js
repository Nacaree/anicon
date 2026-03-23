"use client";

import { useState, useRef, useEffect } from "react";
import { X, ChevronLeft, ImagePlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { postsApi } from "@/lib/api";
import ImageUploadGrid from "./ImageUploadGrid";

/**
 * Full-screen modal for composing a new post.
 * Opened when the user clicks the compact composer trigger on the feed.
 * Contains text area (500 char limit), image upload (up to 10), and post button.
 * Shows a discard confirmation when closing with unsaved content.
 */
export default function PostComposerModal({ isOpen, onClose, onPostCreated, initialFiles, editingPost }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [images, setImages] = useState([]); // { file, preview, url, uploading }
  const [posting, setPosting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const isEditing = !!editingPost;

  // Pre-fill text and images when editing an existing post
  useEffect(() => {
    if (isOpen && editingPost) {
      setText(editingPost.textContent || "");
      // Pre-populate existing images as already-uploaded entries
      if (editingPost.images?.length > 0) {
        setImages(
          editingPost.images.map((img) => ({
            file: null,
            preview: img.imageUrl,
            url: img.imageUrl,
            uploading: false,
          }))
        );
      }
    }
  }, [isOpen, editingPost]);

  // Allow posting with text only, images only, or both
  const hasContent = text.trim().length > 0 || images.length > 0;
  const canPost = (text.trim().length > 0 || images.some((img) => img.url)) && !posting && !uploading;

  // Auto-focus the textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Close on Escape key — shows discard prompt if there's content
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape") {
        if (showDiscard) {
          setShowDiscard(false);
        } else {
          handleClose();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, hasContent, showDiscard]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleTextChange = (e) => {
    const value = e.target.value;
    if (value.length <= 500) {
      setText(value);
    }
  };

  // Shared upload logic — used by both file input and initialFiles
  const uploadFiles = async (files) => {
    if (files.length === 0) return;

    const remaining = 10 - images.length;
    const toUpload = files.slice(0, remaining);

    setUploading(true);

    for (const file of toUpload) {
      if (!file.type.startsWith("image/")) continue;

      const preview = URL.createObjectURL(file);
      const newImage = { file, preview, url: null, uploading: true };
      setImages((prev) => [...prev, newImage]);

      try {
        const url = await postsApi.uploadImage(file, user.id);
        setImages((prev) =>
          prev.map((img) =>
            img.preview === preview ? { ...img, url, uploading: false } : img,
          ),
        );
      } catch (err) {
        console.error("Image upload failed:", err);
        setImages((prev) => prev.filter((img) => img.preview !== preview));
      }
    }

    setUploading(false);
  };

  // Process pre-selected files when modal opens with initialFiles
  useEffect(() => {
    if (isOpen && initialFiles?.length > 0) {
      uploadFiles(initialFiles);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    await uploadFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => {
      const removed = prev[index];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Close handler — shows discard prompt if there's unsaved content
  const handleClose = () => {
    if (hasContent) {
      setShowDiscard(true);
    } else {
      resetAndClose();
    }
  };

  // Discard everything and close
  const handleDiscard = () => {
    setShowDiscard(false);
    resetAndClose();
  };

  // Reset form state and close the modal
  const resetAndClose = () => {
    setText("");
    images.forEach((img) => {
      if (img.preview) URL.revokeObjectURL(img.preview);
    });
    setImages([]);
    onClose();
  };

  const handlePost = async () => {
    if (!canPost) return;

    setPosting(true);
    try {
      if (isEditing) {
        // Edit mode — update text and images
        const imageUrls = images.filter((img) => img.url).map((img) => img.url);
        await postsApi.updatePost(editingPost.id, text.trim() || null, imageUrls);
      } else {
        // Create mode
        const imageUrls = images.filter((img) => img.url).map((img) => img.url);
        await postsApi.createPost(text.trim() || null, imageUrls);
      }
      setText("");
      images.forEach((img) => {
        if (img.preview) URL.revokeObjectURL(img.preview);
      });
      setImages([]);
      onPostCreated?.();
      onClose();
    } catch (err) {
      console.error(isEditing ? "Failed to edit post:" : "Failed to create post:", err);
    } finally {
      setPosting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-stretch md:items-center justify-center animate-in fade-in-0 duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal content — full-screen on mobile, centered card on desktop */}
      <div className="relative z-10 w-full h-full md:h-auto md:max-w-xl md:mx-4 md:rounded-xl flex flex-col bg-white dark:bg-gray-900 shadow-2xl border-0 md:border border-gray-200 dark:border-gray-800 animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative flex items-center justify-center px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          {/* Mobile: back chevron on left */}
          <button
            onClick={handleClose}
            className="absolute left-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors md:hidden"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">
            {isEditing ? "Edit Post" : "Create Post"}
          </h2>
          {/* Desktop: X button on right */}
          <button
            onClick={handleClose}
            className="absolute right-4 w-8 h-8 hidden md:flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-110 active:scale-95"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Composer body — flex-1 so it fills remaining space on mobile full-screen */}
        <div className="p-4 flex-1 overflow-y-auto">
          {/* Text area with hashtag highlighting overlay.
              The overlay div renders behind the transparent textarea, showing
              hashtags in orange while the user types. Both layers share identical
              sizing/font so text aligns perfectly. */}
          <div className="relative">
            {/* Highlight overlay — renders colored hashtags behind the textarea */}
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none whitespace-pre-wrap break-words text-[15px] text-gray-800 dark:text-gray-200"
              style={{ wordBreak: "break-word" }}
            >
              {text ? text.split(/(#\w+)/g).map((part, i) =>
                /^#\w+$/.test(part) ? (
                  <span key={i} className="text-orange-500 font-medium">{part}</span>
                ) : (
                  <span key={i}>{part}</span>
                )
              ) : null}
            </div>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => {
                handleTextChange(e);
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
              placeholder="Share your latest creation..."
              className="w-full resize-none bg-transparent placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none text-[15px] relative"
              style={text ? { color: "transparent", WebkitTextFillColor: "transparent", caretColor: "#1f2937" } : {}}
              rows={1}
            />
          </div>

          {/* Image previews */}
          <ImageUploadGrid
            images={images}
            onRemove={handleRemoveImage}
            onAddMore={() => fileInputRef.current?.click()}
            uploading={uploading}
          />
        </div>

        {/* Bottom bar: image button + char count */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={images.length >= 10 || uploading}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={images.length >= 10 ? "Maximum 10 images" : "Add images"}
            >
              <ImagePlus className="w-5 h-5 text-orange-500" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Post button */}
            <button
              onClick={handlePost}
              disabled={!canPost}
              className="px-8 py-1.5 bg-orange-500 text-white text-sm font-medium rounded-full
                hover:bg-orange-600 hover:shadow-[0_4px_20px_rgba(255,121,39,0.4)]
                hover:scale-[1.02] active:scale-[0.98] transition-all
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:scale-100"
            >
              {posting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                isEditing ? "Save" : "Post"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Discard confirmation — custom inline modal so it renders above the
          composer (z-60) without fighting with Radix Dialog's portal z-index */}
      {showDiscard && (
        <div className="fixed inset-0 z-70 flex items-end md:items-center justify-center animate-in fade-in-0 duration-150">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDiscard(false)} />
          <div className="relative z-10 w-full max-w-none md:max-w-sm mx-0 md:mx-4 rounded-t-2xl md:rounded-xl bg-white dark:bg-gray-900 shadow-2xl border-t md:border border-gray-200 dark:border-gray-800 p-6 animate-in duration-200 slide-in-from-bottom-4 md:slide-in-from-bottom-0 md:zoom-in-95">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Discard post?</h3>
            <p className="text-sm text-gray-500 mt-2">
              Your changes will be lost if you discard.
            </p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowDiscard(false)}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-full
                  transition-all duration-300 hover:scale-[1.02]
                  hover:shadow-[0_4px_20px_rgba(255,121,39,0.4)] active:scale-[0.98]"
              >
                Keep editing
              </button>
              <button
                onClick={handleDiscard}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-full
                  transition-all duration-300 hover:scale-[1.02]
                  hover:shadow-[0_4px_20px_rgba(239,68,68,0.4)] active:scale-[0.98]"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
