# Support Links Redesign

## Summary

Redesigned the support/tip links section from a flat list of emoji+button pairs to a DeviantArt-inspired "tip jar" dropdown. Also fixed URL handling bugs, added new payment platforms, and improved the edit profile save flow.

## Changes

### Support Links Display (`SupportLinksDisplay.js`)
- **New design:** Single "Support me" button that opens a dropdown panel with platform links
- **Brand icons:** CDN-hosted logos for ABA, Wing, Ko-fi, PayPal; local images for ACLEDA and Patreon (`/icons/acleda.png`, `/icons/patreon.png`); emoji fallback on load failure
- **URL normalization:** `normalizeUrl()` handles missing protocols, embedded URLs in text, and edge cases
- **Label fallback:** If a user enters a URL in the label field, the display falls back to the platform name from config
- **Generic button text:** "Support me" works for all roles (fan, influencer, creator)

### New Payment Platform
- Added **ACLEDA** to both the display config and the settings page type dropdown

### Edit Profile Page (`/settings/creator/page.js`)
- **Save redirects to profile:** After successful save, navigates to `/profiles/{username}` instead of showing an inline success message
- **Auto-fill label:** When user changes the support link type dropdown, the label auto-fills from the type name (only if currently empty)

### Platform Icon Assets
- `frontend/public/icons/acleda.png` — ACLEDA bank logo
- `frontend/public/icons/patreon.png` — Patreon logo
