'use client';

import { ROLES } from '@/lib/roles';

/**
 * Displays all of the user's non-fan roles as colored badges.
 * Fan role is hidden since it's the default — only special roles get badges.
 * Users with multiple roles (e.g. creator+organizer) see multiple badges.
 */

const ROLE_CONFIG = {
  [ROLES.INFLUENCER]: {
    label: 'Influencer',
    emoji: '\uD83C\uDFC5',
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  [ROLES.CREATOR]: {
    label: 'Creator',
    emoji: '\uD83C\uDFA8',
    className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  },
  [ROLES.ORGANIZER]: {
    label: 'Organizer',
    emoji: '\uD83C\uDFAA',
    className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  },
};

export function RoleBadge({ roles }) {
  if (!Array.isArray(roles)) return null;

  // Filter to only roles that have a badge config (excludes fan)
  const visibleRoles = roles.filter(r => ROLE_CONFIG[r]);
  if (visibleRoles.length === 0) return null;

  return (
    <>
      {visibleRoles.map(role => {
        const config = ROLE_CONFIG[role];
        return (
          <span key={role} className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
            <span>{config.emoji}</span>
            {config.label}
          </span>
        );
      })}
    </>
  );
}
