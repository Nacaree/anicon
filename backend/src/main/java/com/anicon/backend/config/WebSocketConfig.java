package com.anicon.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * STOMP over WebSocket configuration for real-time notifications.
 * Clients connect to /ws, authenticate via JWT in the STOMP CONNECT frame,
 * and subscribe to /user/queue/notifications for push notifications.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${cors.allowed.origins}")
    private String allowedOrigins;

    private final WebSocketAuthInterceptor authInterceptor;

    public WebSocketConfig(WebSocketAuthInterceptor authInterceptor) {
        this.authInterceptor = authInterceptor;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // In-memory broker for /queue (user-specific) and /topic (broadcast)
        registry.enableSimpleBroker("/queue", "/topic");
        // Prefix for messages FROM clients TO server (@MessageMapping methods)
        registry.setApplicationDestinationPrefixes("/app");
        // Prefix for user-specific destinations — Spring routes
        // /user/queue/notifications to the correct user's session automatically
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // WebSocket endpoint — clients connect here
        // SockJS fallback is included for environments where raw WebSocket is blocked
        String[] origins = allowedOrigins.split(",");
        for (int i = 0; i < origins.length; i++) {
            origins[i] = origins[i].strip();
        }
        registry.addEndpoint("/ws")
                .setAllowedOrigins(origins)
                .withSockJS();

        // Also register without SockJS for native WebSocket clients
        registry.addEndpoint("/ws")
                .setAllowedOrigins(origins);
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // Intercept STOMP CONNECT frames to authenticate via JWT
        registration.interceptors(authInterceptor);
    }
}
