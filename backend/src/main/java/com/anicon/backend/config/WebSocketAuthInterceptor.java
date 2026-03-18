package com.anicon.backend.config;

import java.security.Principal;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import com.anicon.backend.security.SupabaseJwtValidator;
import com.anicon.backend.security.SupabaseUserPrincipal;

import io.jsonwebtoken.Claims;

/**
 * Intercepts STOMP CONNECT frames to authenticate via JWT.
 * Extracts the token from the "Authorization" STOMP header,
 * validates it using the existing SupabaseJwtValidator, and sets
 * a SupabaseUserPrincipal on the session. This enables Spring's
 * /user/ destination routing to deliver messages to the correct user.
 */
@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private static final Logger log = LoggerFactory.getLogger(WebSocketAuthInterceptor.class);

    private final SupabaseJwtValidator jwtValidator;

    public WebSocketAuthInterceptor(SupabaseJwtValidator jwtValidator) {
        this.jwtValidator = jwtValidator;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            // Extract JWT from the STOMP "Authorization" header
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                try {
                    Claims claims = jwtValidator.validateToken(token);
                    String userId = claims.getSubject();
                    String email = claims.get("email", String.class);
                    String role = claims.get("role", String.class);
                    if (role == null) role = "authenticated";

                    // Set the principal — Spring uses this for /user/ destination routing.
                    // getName() must return the user ID so convertAndSendToUser(userId, ...) works.
                    SupabaseUserPrincipal principal = new SupabaseUserPrincipal(UUID.fromString(userId), email, role);
                    accessor.setUser(new StompPrincipal(principal));

                    log.debug("WebSocket authenticated: userId={}", userId);
                } catch (Exception e) {
                    log.warn("WebSocket auth failed: {}", e.getMessage());
                    // Returning null rejects the CONNECT frame
                    return null;
                }
            } else {
                log.warn("WebSocket CONNECT missing Authorization header");
                return null;
            }
        }

        return message;
    }

    /**
     * Wraps SupabaseUserPrincipal as a Principal whose getName() returns the user ID.
     * Spring's user-destination routing uses getName() to match /user/{name}/queue/...
     * so this MUST return the UUID string that we use in convertAndSendToUser().
     */
    private record StompPrincipal(SupabaseUserPrincipal userPrincipal) implements Principal {
        @Override
        public String getName() {
            return userPrincipal.getUserId().toString();
        }
    }
}
