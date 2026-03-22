package com.anicon.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.anicon.backend.security.JwtAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Value("${cors.allowed.origins}")
    private String allowedOrigins;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // WebSocket handshake is an HTTP upgrade — auth happens at STOMP level
                        .requestMatchers("/ws/**").permitAll()
                        .requestMatchers("/api/health", "/api/public/**").permitAll()
                        // Email existence check for forgot-password page — no auth required
                        .requestMatchers(HttpMethod.POST, "/api/auth/check-email").permitAll()
                        // Event listing and detail viewing are public — no login required to browse
                        .requestMatchers(HttpMethod.GET, "/api/events", "/api/events/**").permitAll()
                        // Profile lookups are public — anyone can view profiles without logging in
                        .requestMatchers(HttpMethod.GET, "/api/profiles/**").permitAll()
                        // Follower/following lists and counts are public — anyone can see who follows whom
                        .requestMatchers(HttpMethod.GET, "/api/follows/*/followers", "/api/follows/*/following", "/api/follows/*/counts").permitAll()
                        // Portfolio viewing is public — anyone can browse a creator's work
                        .requestMatchers(HttpMethod.GET, "/api/creator/*/portfolio").permitAll()
                        // Profile event tabs are public — shows events a user is going to or hosting
                        .requestMatchers(HttpMethod.GET, "/api/users/*/events/**").permitAll()
                        // Unified feed is public (optionally authenticated for post liked/reposted state)
                        .requestMatchers(HttpMethod.GET, "/api/feed").permitAll()
                        // Post feed, user posts, and single post detail are public (optionally authenticated for liked/reposted state)
                        .requestMatchers(HttpMethod.GET, "/api/posts/feed", "/api/posts/user/**").permitAll()
                        // Single post detail — must come after /feed and /user/** to avoid shadowing
                        .requestMatchers(HttpMethod.GET, "/api/posts/*").permitAll()
                        // Comments on posts are public
                        .requestMatchers(HttpMethod.GET, "/api/posts/*/comments").permitAll()
                        // Search is public (optionally authenticated for post liked state)
                        .requestMatchers(HttpMethod.GET, "/api/search").permitAll()
                        // Trending hashtags are public — used by the right sidebar
                        .requestMatchers(HttpMethod.GET, "/api/trending").permitAll()
                        // Stripe webhook — authenticated via HMAC signature, not JWT
                        .requestMatchers(HttpMethod.POST, "/api/stripe/webhook").permitAll()
                        // Event status is optionally authenticated: guests get zeros, logged-in users get real counts.
                        // The frontend sends a cached token if available (no getSession() call) so the fetch fires
                        // immediately on page load without waiting for auth initialization.
                        .requestMatchers(HttpMethod.GET, "/api/tickets/event-status/**").permitAll()
                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public UrlBasedCorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        for (String origin : allowedOrigins.split(",")) {
            configuration.addAllowedOrigin(origin.strip());
        }
        configuration.addAllowedMethod("*");
        configuration.addAllowedHeader("*");
        configuration.setAllowCredentials(true);
        // Cache the preflight result for 1 hour in the browser.
        // Without this, the browser sends an OPTIONS preflight before EVERY API call,
        // doubling round trips and adding ~150-200ms per request in production.
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}