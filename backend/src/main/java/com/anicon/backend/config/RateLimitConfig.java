package com.anicon.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import lombok.Data;

@Data
@Configuration
@ConfigurationProperties(prefix = "rate-limit")
public class RateLimitConfig {

    private int defaultRequestsPerMinute = 60;
    private int authRequestsPerMinute = 10;
    private int publicRequestsPerMinute = 30;
}
