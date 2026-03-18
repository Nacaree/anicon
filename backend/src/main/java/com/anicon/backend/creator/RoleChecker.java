package com.anicon.backend.creator;

import com.anicon.backend.gen.jooq.enums.UserRole;

import java.util.Arrays;

/**
 * Utility for role-based feature gating across the creator/portfolio system.
 * Mirrors the permission matrix in docs/FEATURE3_COMPLETE.md.
 */
public class RoleChecker {

    private RoleChecker() {} // Utility class — no instantiation

    public static boolean hasRole(UserRole[] roles, UserRole role) {
        return roles != null && Arrays.asList(roles).contains(role);
    }

    public static boolean isCreator(UserRole[] roles) {
        return hasRole(roles, UserRole.creator);
    }

    public static boolean isInfluencer(UserRole[] roles) {
        return hasRole(roles, UserRole.influencer);
    }

    public static boolean isOrganizer(UserRole[] roles) {
        return hasRole(roles, UserRole.organizer);
    }

    /** Portfolio is creator-only */
    public static boolean canHavePortfolio(UserRole[] roles) {
        return isCreator(roles);
    }

    /** Support/tip links available to everyone except organizers */
    public static boolean canHaveSupportLinks(UserRole[] roles) {
        // Creator+Organizer combo keeps support links (they're also a creator)
        return !isOrganizer(roles) || isCreator(roles);
    }
}
