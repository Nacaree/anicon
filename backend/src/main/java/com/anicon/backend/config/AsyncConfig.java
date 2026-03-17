package com.anicon.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Enables async method execution for @Async annotations.
 * Used by NotificationEventHandler to process notification events
 * on a background thread without blocking API responses.
 */
@Configuration
@EnableAsync
public class AsyncConfig {
}
