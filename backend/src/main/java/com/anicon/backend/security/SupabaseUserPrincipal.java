package com.anicon.backend.security;

import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Represents the authenticated user from a Supabase JWT token.
 * This class holds the user's ID, email, and email verification status
 * extracted from the JWT claims.
 */
@Getter
@AllArgsConstructor
public class SupabaseUserPrincipal {
    private final UUID userId;
    private final String email;
    private final boolean emailVerified;
}
