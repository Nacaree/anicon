package com.anicon.backend.creator;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.anicon.backend.creator.dto.CreatorProfileUpdateRequest;
import com.anicon.backend.security.SupabaseUserPrincipal;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/creator")
public class CreatorController {

    private final CreatorService creatorService;

    public CreatorController(CreatorService creatorService) {
        this.creatorService = creatorService;
    }

    /**
     * Update creator-specific profile fields.
     * Any authenticated user can call this — setting creatorType enables creator mode.
     */
    @PatchMapping("/profile")
    public ResponseEntity<?> updateCreatorProfile(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @RequestBody @Valid CreatorProfileUpdateRequest request) {
        creatorService.updateCreatorProfile(principal.getUserId(), request);
        return ResponseEntity.ok().build();
    }
}
