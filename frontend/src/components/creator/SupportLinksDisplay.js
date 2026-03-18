"use client";

import { useState, useCallback } from "react";
import { Heart, ExternalLink, ChevronDown, X } from "lucide-react";

// Renders a platform logo from a CDN URL, falling back to an emoji if the
// image fails to load or no URL is configured.
function PlatformIcon({ logo, fallback, label }) {
  const [failed, setFailed] = useState(false);
  const onError = useCallback(() => setFailed(true), []);

  if (!logo || failed) {
    return <span className="text-base leading-none">{fallback}</span>;
  }

  return (
    <img
      src={logo}
      alt={label}
      width={20}
      height={20}
      className="w-8 h-8 rounded-md object-contain"
      onError={onError}
    />
  );
}

// Platform config — logo URL, emoji fallback, and default label for each type.
// Uses CDN-hosted brand logos where available; falls back to emoji if the
// image fails to load (handled by onError in the PlatformIcon component).
const PLATFORM_CONFIG = {
  aba: {
    logo: "https://cdn.brandfetch.io/iduTsrn35q/w/800/h/800/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B",
    fallback: "🏦",
    label: "ABA Pay",
  },
  acleda: {
    logo: "/icons/acleda.png",
    fallback: "🏦",
    label: "ACLEDA",
  },
  wing: {
    logo: "https://cdn.brandfetch.io/idycmetFR9/w/400/h/400/theme/dark/icon.jpeg",
    fallback: "📱",
    label: "Wing",
  },
  kofi: {
    logo: "https://cdn.brandfetch.io/idazuqA3E-/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B",
    fallback: "☕",
    label: "Ko-fi",
  },
  paypal: {
    logo: "https://cdn.brandfetch.io/id-Wd4a4TS/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B",
    fallback: "💳",
    label: "PayPal",
  },
  patreon: {
    logo: "/icons/patreon.png",
    fallback: "🎨",
    label: "Patreon",
  },
  other: {
    logo: null,
    fallback: "💰",
    label: "Support",
  },
};

// Extracts a usable absolute URL from user input. Handles cases where:
// - The value is already a clean URL ("https://ko-fi.com/user")
// - The value is a URL missing the protocol ("ko-fi.com/user")
// - The value is a message with an embedded URL ("Please pay here: https://...")
function normalizeUrl(raw) {
  if (!raw) return "#";
  const trimmed = raw.trim();

  // Already a proper absolute URL
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  // Try to find an embedded https:// or http:// URL inside the text
  const match = trimmed.match(/https?:\/\/\S+/i);
  if (match) return match[0];

  // No protocol at all — prepend https://
  return `https://${trimmed}`;
}

// DeviantArt-inspired "tip jar" design: a single prominent button that opens
// a dropdown revealing the available support links. Keeps the profile clean
// with one CTA instead of a list of buttons.
export function SupportLinksDisplay({ links }) {
  const [open, setOpen] = useState(false);

  if (!links?.length) return null;

  return (
    <div className="relative">
      {/* Single "Support" button — the only thing visible by default */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-medium text-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 hover:shadow-[0_4px_20px_rgba(255,121,39,0.4)]"
      >
        <Heart className="w-4 h-4" />
        Support me
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown panel — reveals the list of support links */}
      {open && (
        <>
          {/* Invisible backdrop to close on outside click */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute left-0 top-full mt-2 z-50 w-80 rounded-xl border bg-popover shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <span className="text-sm font-semibold text-muted-foreground">
                Choose a method
              </span>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Link list */}
            <div className="pb-2">
              {links.map((link, i) => {
                const config =
                  PLATFORM_CONFIG[link.type] || PLATFORM_CONFIG.other;
                const isUrl = link.label && /^https?:\/\//i.test(link.label);
                const displayLabel =
                  !link.label || isUrl ? config.label : link.label;

                return (
                  <a
                    key={i}
                    href={normalizeUrl(link.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                    className="group flex items-center gap-4 mx-2 px-3 py-3 rounded-lg hover:bg-muted/60 transition-colors duration-150"
                  >
                    {/* Platform icon — no background, just the logo */}
                    <span className="flex items-center justify-center w-8 h-8 shrink-0">
                      <PlatformIcon
                        logo={config.logo}
                        fallback={config.fallback}
                        label={displayLabel}
                      />
                    </span>

                    {/* Label */}
                    <span className="flex-1 text-[15px] font-medium">
                      {displayLabel}
                    </span>

                    {/* External link arrow */}
                    <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0" />
                  </a>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
