'use client';

const CREATOR_TYPES = {
  cosplayer: { label: 'Cosplayer', icon: '🎭' },
  digital_artist: { label: 'Digital Artist', icon: '🎨' },
  traditional_artist: { label: 'Traditional Artist', icon: '🖌️' },
  crafter: { label: 'Crafter', icon: '✂️' },
  writer: { label: 'Writer', icon: '✍️' },
};

// Displays the creator's specialty as a colored pill badge
export function CreatorTypeBadge({ type }) {
  if (!type) return null;

  const config = CREATOR_TYPES[type] || { label: type, icon: '🎨' };

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}
