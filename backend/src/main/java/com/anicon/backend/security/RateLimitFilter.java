package com.anicon.backend.security;

import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.TimeUnit;

import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.anicon.backend.config.RateLimitConfig;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    // Maximum number of IP addresses to store in memory to prevent OOM attacks
    private static final int MAX_BUCKET_CACHE_SIZE = 10000;
    private static final String HEADER_X_FORWARDED_FOR = "X-Forwarded-For";
    private final RateLimitConfig rateLimitConfig;

    // Cache to store rate limit buckets, keyed by "IP:Type"
    // Uses Caffeine for automatic eviction of unused entries
    private final Cache<String, Bucket> buckets;

    public RateLimitFilter(RateLimitConfig rateLimitConfig) {
        this.rateLimitConfig = rateLimitConfig;
        // Initialize the cache with eviction policies
        this.buckets = Caffeine.newBuilder()
                .expireAfterAccess(10, TimeUnit.MINUTES) // Remove entries if not accessed for 10 mins
                .maximumSize(MAX_BUCKET_CACHE_SIZE)
                .build();
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        // 1. Identify the client
        String clientIp = getClientIp(request);
        String path = request.getRequestURI();

        // 2. Determine the rate limit key (e.g., "192.168.1.1:auth")
        String bucketKey = clientIp + ":" + getBucketType(path);

        // 3. Get existing bucket or create a new one if it doesn't exist
        Bucket bucket = buckets.get(bucketKey, k -> createBucket(path));

        // 4. Try to consume 1 token from the bucket
        if (bucket.tryConsume(1)) {
            // Success: Request allowed, proceed down the filter chain
            filterChain.doFilter(request, response);
        } else {
            // Failure: Rate limit exceeded, return 429 Too Many Requests
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write("{\"error\": \"Too many requests. Please try again later.\"}");
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader(HEADER_X_FORWARDED_FOR);
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            // Security: Always take the LAST IP in the list to prevent spoofing
            // The real client IP is the last one in the chain added by the proxy.
            String[] ips = xForwardedFor.split(",");
            return ips[ips.length - 1].trim();
        }
        return request.getRemoteAddr();
    }

    private String getBucketType(String path) {
        // Categorize requests to apply different limits
        if (path.startsWith("/api/auth/")) {
            return "auth";
        } else if (path.startsWith("/api/public/") || path.equals("/api/health")) {
            return "public";
        }
        return "default";
    }

    private Bucket createBucket(String path) {
        // Determine the limit based on the path category
        int requestsPerMinute;

        if (path.startsWith("/api/auth/")) {
            requestsPerMinute = rateLimitConfig.getAuthRequestsPerMinute();
        } else if (path.startsWith("/api/public/") || path.equals("/api/health")) {
            requestsPerMinute = rateLimitConfig.getPublicRequestsPerMinute();
        } else {
            requestsPerMinute = rateLimitConfig.getDefaultRequestsPerMinute();
        }

        // Create a new bucket with the specified capacity and refill rate
        Bandwidth limit = Bandwidth.builder()
                .capacity(requestsPerMinute)
                .refillGreedy(requestsPerMinute, Duration.ofMinutes(1))
                .build();

        return Bucket.builder()
                .addLimit(limit)
                .build();
    }

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        // Skip rate limiting for OPTIONS requests (CORS preflight)
        return "OPTIONS".equalsIgnoreCase(request.getMethod());
    }
}
