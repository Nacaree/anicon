package com.anicon.backend.security;

import java.io.IOException;
import java.util.Collections;
import java.util.UUID;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final SupabaseJwtValidator jwtValidator;

    public JwtAuthenticationFilter(SupabaseJwtValidator jwtValidator) {
        this.jwtValidator = jwtValidator;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);

            try {
                // Use the validator to verify signature and extract claims
                Claims claims = jwtValidator.validateToken(token);
                String userId = claims.getSubject(); // "sub" claim
                String email = claims.get("email", String.class);
                Boolean emailVerified = claims.get("email_verified", Boolean.class);

                if (userId != null && !userId.isEmpty()) {
                    // Create a principal with user info from JWT claims
                    SupabaseUserPrincipal principal = new SupabaseUserPrincipal(
                            UUID.fromString(userId),
                            email,
                            emailVerified != null && emailVerified);

                    // Create authentication token with our custom principal
                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                            principal,
                            null,
                            Collections.emptyList());

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            } catch (Exception e) {
                logger.error("JWT validation failed", e);
            }
        }
        // * This tells Spring: "I'm done with my check, now move on to the next filter
        // or the actual API controller." Without this line, the request would hang and
        // never finish
        filterChain.doFilter(request, response);
    }
}
