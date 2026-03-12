package com.anicon.backend.creator;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.anicon.backend.creator.dto.PortfolioItemRequest;
import com.anicon.backend.creator.dto.PortfolioItemResponse;
import com.anicon.backend.security.SupabaseUserPrincipal;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/creator")
public class PortfolioController {

    private final PortfolioService portfolioService;

    public PortfolioController(PortfolioService portfolioService) {
        this.portfolioService = portfolioService;
    }

    /**
     * Get portfolio items for any user (public).
     */
    @GetMapping("/{userId}/portfolio")
    public ResponseEntity<List<PortfolioItemResponse>> getPortfolio(@PathVariable UUID userId) {
        return ResponseEntity.ok(portfolioService.getPortfolio(userId));
    }

    /**
     * Add new portfolio item (authenticated user only).
     */
    @PostMapping("/portfolio")
    public ResponseEntity<PortfolioItemResponse> addPortfolioItem(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @RequestBody @Valid PortfolioItemRequest request) {
        PortfolioItemResponse response = portfolioService.addItem(principal.getUserId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Update portfolio item (owner only).
     */
    @PutMapping("/portfolio/{id}")
    public ResponseEntity<PortfolioItemResponse> updatePortfolioItem(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID id,
            @RequestBody @Valid PortfolioItemRequest request) {
        PortfolioItemResponse response = portfolioService.updateItem(principal.getUserId(), id, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Delete portfolio item (owner only).
     */
    @DeleteMapping("/portfolio/{id}")
    public ResponseEntity<Void> deletePortfolioItem(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID id) {
        portfolioService.deleteItem(principal.getUserId(), id);
        return ResponseEntity.noContent().build();
    }
}
