/**
 * Role checking utilities — mirrors backend RoleChecker.java.
 * Used by profile components to conditionally show sections based on user role.
 */

export const ROLES = {
  FAN: 'fan',
  INFLUENCER: 'influencer',
  CREATOR: 'creator',
  ORGANIZER: 'organizer',
};

export function hasRole(roles, role) {
  return Array.isArray(roles) && roles.includes(role);
}

export function isCreator(roles) {
  return hasRole(roles, ROLES.CREATOR);
}

export function isInfluencer(roles) {
  return hasRole(roles, ROLES.INFLUENCER);
}

export function isOrganizer(roles) {
  return hasRole(roles, ROLES.ORGANIZER);
}

/** Portfolio gallery — creator only */
export function canHavePortfolio(roles) {
  return isCreator(roles);
}

/** Commission menu — creator or influencer */
export function canHaveCommissions(roles) {
  return isCreator(roles) || isInfluencer(roles);
}

/** Support/tip links — everyone except organizer */
export function canHaveSupportLinks(roles) {
  return !isOrganizer(roles);
}

/** "Going" events tab — everyone except organizer (organizers run events, don't attend) */
export function canHaveGoingEvents(roles) {
  return !isOrganizer(roles);
}

/** "Hosted" events tab — only organizers (includes creator+organizer combo) */
export function canHaveHostedEvents(roles) {
  return isOrganizer(roles);
}

/** Returns the highest-priority role for display purposes */
export function getPrimaryRole(roles) {
  if (isOrganizer(roles)) return ROLES.ORGANIZER;
  if (isCreator(roles)) return ROLES.CREATOR;
  if (isInfluencer(roles)) return ROLES.INFLUENCER;
  return ROLES.FAN;
}
