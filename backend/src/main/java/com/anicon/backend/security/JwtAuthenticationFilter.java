package com.anicon.backend.security;

import java.io.IOException;
import java.util.UUID;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final SupabaseJwtValidator supabaseJwtValidator;

    public JwtAuthenticationFilter(SupabaseJwtValidator supabaseJwtValidator) {
        this.supabaseJwtValidator = supabaseJwtValidator;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);

        try {
            // Delegate validation to SupabaseJwtValidator (handles ES256 via JWKS)
            Claims claims = supabaseJwtValidator.validateToken(token);

            String userIdStr = claims.getSubject(); // Supabase User ID (UUID)
            String email = claims.get("email", String.class);
            String role = claims.get("role", String.class); // e.g. "authenticated"

            if (userIdStr != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                SupabaseUserPrincipal principal = new SupabaseUserPrincipal(UUID.fromString(userIdStr), email, role);
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(principal, null,
                        principal.getAuthorities());
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        } catch (Exception e) {
            logger.error("JWT Validation failed: " + e.getMessage());
        }

        filterChain.doFilter(request, response);
    }
}