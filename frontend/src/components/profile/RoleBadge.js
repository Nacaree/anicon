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
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-blue-500/25',
  },
  [ROLES.CREATOR]: {
    label: 'Creator',
    className: 'bg-[#2ED1E4]/15 text-[#18b3c4] shadow-[#2ED1E4]/25',
  },
  [ROLES.ORGANIZER]: {
    label: 'Organizer',
    className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 shadow-orange-500/25',
  },
};

/**
 * @param {Object} props
 * @param {string[]} props.roles - Array of role strings
 * @param {'sm' | 'md'} [props.size='md'] - sm: compact, no shadow (detail page). md: default with shadow (profile page).
 */
export function RoleBadge({ roles, size = 'md' }) {
  if (!Array.isArray(roles)) return null;

  // Filter to only roles that have a badge config (excludes fan)
  const visibleRoles = roles.filter(r => ROLE_CONFIG[r]);
  if (visibleRoles.length === 0) return null;

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs'
    : 'px-3 py-0.5 text-[12px] shadow-sm';

  return (
    <>
      {visibleRoles.map(role => {
        const config = ROLE_CONFIG[role];
        return (
          <span key={role} className={`inline-flex items-center rounded-full font-medium ${sizeClasses} ${config.className}`}>
            {config.label}
          </span>
        );
      })}
    </>
  );
}
