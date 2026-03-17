"use client";

import { X, ImagePlus } from "lucide-react";

/**
 * Facebook-style image preview for the post composer.
 * 1 image: full-width preview. 2 images: side by side. 3+: first large, rest in a row.
 * Each image has a remove button. An "add more" button appears in the corner.
 */
export default function ImageUploadGrid({ images, onRemove, onAddMore, uploading }) {
  if (images.length === 0 && !uploading) return null;

  const count = images.length;

  return (
    <div className="relative mt-2 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Image layout — Facebook-style adaptive grid */}
      {count === 1 && (
        <div className="relative group">
          <img
            src={images[0].preview || images[0].url}
            alt="Upload 1"
            className="w-full max-h-[300px] object-contain bg-gray-100 dark:bg-gray-800"
          />
          <RemoveBtn onClick={() => onRemove(0)} />
          {images[0].uploading && <UploadOverlay />}
        </div>
      )}

      {count === 2 && (
        <div className="grid grid-cols-2 gap-0.5">
          {images.map((img, i) => (
            <div key={img.url || i} className="relative group">
              <img
                src={img.preview || img.url}
                alt={`Upload ${i + 1}`}
                className="w-full h-[200px] object-cover"
              />
              <RemoveBtn onClick={() => onRemove(i)} />
              {img.uploading && <UploadOverlay />}
            </div>
          ))}
        </div>
      )}

      {count >= 3 && (
        <div className="flex flex-col gap-0.5">
          {/* First image — large */}
          <div className="relative group">
            <img
              src={images[0].preview || images[0].url}
              alt="Upload 1"
              className="w-full h-[200px] object-cover"
            />
            <RemoveBtn onClick={() => onRemove(0)} />
            {images[0].uploading && <UploadOverlay />}
          </div>
          {/* Remaining images in a row */}
          <div className="grid grid-cols-3 gap-0.5">
            {images.slice(1, 4).map((img, i) => (
              <div key={img.url || i + 1} className="relative group">
                <img
                  src={img.preview || img.url}
                  alt={`Upload ${i + 2}`}
                  className="w-full h-[100px] object-cover"
                />
                <RemoveBtn onClick={() => onRemove(i + 1)} />
                {img.uploading && <UploadOverlay />}
                {/* "+N more" overlay on the last visible thumbnail */}
                {i === 2 && count > 4 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white text-lg font-bold">+{count - 4}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploading spinner when no images yet */}
      {count === 0 && uploading && (
        <div className="h-[150px] flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Add more button — floating in top-right corner */}
      {count > 0 && count < 10 && !uploading && (
        <button
          onClick={onAddMore}
          className="absolute top-2 left-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <ImagePlus className="w-4 h-4" />
          Add photos
        </button>
      )}
    </div>
  );
}

/** Small X button to remove an image */
function RemoveBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
    >
      <X className="w-4 h-4" />
    </button>
  );
}

/** Spinner overlay shown while an image is uploading */
function UploadOverlay() {
  return (
    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
