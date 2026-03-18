package com.anicon.backend.social;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PostCommentRepository extends JpaRepository<PostComment, UUID> {

    /**
     * Fetch all comments for a post, ordered by creation time.
     * Includes both top-level comments and replies — the service
     * separates them into a tree structure.
     */
    List<PostComment> findByPostIdOrderByCreatedAtAsc(UUID postId);
}
