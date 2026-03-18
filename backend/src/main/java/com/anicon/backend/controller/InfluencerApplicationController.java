package com.anicon.backend.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.anicon.backend.dto.InfluencerApplicationRequest;
import com.anicon.backend.dto.InfluencerApplicationResponse;
import com.anicon.backend.security.SupabaseUserPrincipal;
import com.anicon.backend.service.InfluencerApplicationService;

import jakarta.validation.Valid;

/**
 * Endpoints for the influencer (verified host) application flow.
 * Both endpoints require authentication — covered by SecurityConfig's
 * .anyRequest().authenticated() catch-all.
 */
@RestController
@RequestMapping("/api/influencer-applications")
public class InfluencerApplicationController {

    private final InfluencerApplicationService applicationService;

    public InfluencerApplicationController(InfluencerApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    /**
     * Submit an application to become a verified host (influencer).
     * Returns 409 if user already has a pending application or is already an influencer.
     */
    @PostMapping
    public ResponseEntity<InfluencerApplicationResponse> submitApplication(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @RequestBody @Valid InfluencerApplicationRequest request) {

        InfluencerApplicationResponse response = applicationService.submitApplication(
                principal.getUserId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get the current user's most recent application status.
     * Returns 404 if they have never applied.
     */
    @GetMapping("/my")
    public ResponseEntity<InfluencerApplicationResponse> getMyApplication(
            @AuthenticationPrincipal SupabaseUserPrincipal principal) {

        return applicationService.getMyApplication(principal.getUserId())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
