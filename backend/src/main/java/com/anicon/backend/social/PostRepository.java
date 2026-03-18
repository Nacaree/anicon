package com.anicon.backend.social;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PostRepository extends JpaRepository<Post, UUID> {

    /**
     * Check if a user has already reposted a specific post.
     * Used to prevent duplicate reposts.
     */
    boolean existsByUserIdAndOriginalPostId(UUID userId, UUID originalPostId);

    /**
     * Find a user's repost of a specific original post.
     * Used for undo-repost to find and delete the repost row.
     */
    Optional<Post> findByUserIdAndOriginalPostId(UUID userId, UUID originalPostId);
}
