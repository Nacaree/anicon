package com.anicon.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.UUID;

/**
 * Service for Supabase Admin API operations.
 * Uses the service_role key for admin-level operations like deleting users
 * and sending verification emails.
 */
@Service
public class SupabaseAdminService {

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.service.role.key:}")
    private String serviceRoleKey;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Deletes a user from Supabase auth.users table.
     * Used for cleanup when profile creation fails during signup.
     */
    public void deleteUser(UUID userId) {
        if (serviceRoleKey == null || serviceRoleKey.isEmpty()) {
            throw new IllegalStateException("Supabase service role key not configured");
        }

        String url = supabaseUrl + "/auth/v1/admin/users/" + userId;

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(serviceRoleKey);
        headers.set("apikey", serviceRoleKey);

        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            restTemplate.exchange(url, HttpMethod.DELETE, entity, Void.class);
        } catch (Exception e) {
            throw new RuntimeException("Failed to delete user from Supabase: " + e.getMessage(), e);
        }
    }

    /**
     * Resends the email verification link to a user.
     */
    public void resendVerificationEmail(String email) {
        if (serviceRoleKey == null || serviceRoleKey.isEmpty()) {
            throw new IllegalStateException("Supabase service role key not configured");
        }

        String url = supabaseUrl + "/auth/v1/resend";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(serviceRoleKey);
        headers.set("apikey", serviceRoleKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = Map.of(
            "type", "signup",
            "email", email
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            restTemplate.postForEntity(url, entity, Void.class);
        } catch (Exception e) {
            throw new RuntimeException("Failed to resend verification email: " + e.getMessage(), e);
        }
    }

    /**
     * Sends a magic link login email to a user.
     */
    public void sendMagicLink(String email, String redirectTo) {
        if (serviceRoleKey == null || serviceRoleKey.isEmpty()) {
            throw new IllegalStateException("Supabase service role key not configured");
        }

        String url = supabaseUrl + "/auth/v1/magiclink";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(serviceRoleKey);
        headers.set("apikey", serviceRoleKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = Map.of(
            "email", email,
            "options", Map.of("emailRedirectTo", redirectTo)
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            restTemplate.postForEntity(url, entity, Void.class);
        } catch (Exception e) {
            throw new RuntimeException("Failed to send magic link: " + e.getMessage(), e);
        }
    }
}
