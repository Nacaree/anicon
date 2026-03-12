'use client';

import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SUPPORT_ICONS = {
  aba: '🏦',
  wing: '📱',
  kofi: '☕',
  paypal: '💳',
  patreon: '🎨',
  other: '💰',
};

// Renders a row of tip/support buttons that open external payment links
export function SupportLinksDisplay({ links }) {
  if (!links?.length) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">Support</h2>
      <div className="flex flex-wrap gap-2">
        {links.map((link, i) => {
          const icon = SUPPORT_ICONS[link.type] || SUPPORT_ICONS.other;

          return (
            <Button
              key={i}
              variant="outline"
              size="sm"
              className="hover:scale-[1.02] active:scale-[0.98] transition-all"
              asChild
            >
              <a href={link.url} target="_blank" rel="noopener noreferrer">
                <span className="mr-2">{icon}</span>
                {link.label}
                <ExternalLink className="w-3 h-3 ml-2" />
              </a>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
