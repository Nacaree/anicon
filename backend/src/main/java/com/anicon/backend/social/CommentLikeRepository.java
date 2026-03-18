package com.anicon.backend.social;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CommentLikeRepository extends JpaRepository<CommentLike, CommentLike.CommentLikeId> {

    boolean existsByUserIdAndCommentId(UUID userId, UUID commentId);

    void deleteByUserIdAndCommentId(UUID userId, UUID commentId);

    /**
     * Batch-fetch which comments a user has liked from a given set.
     */
    @Query("SELECT cl.commentId FROM CommentLike cl WHERE cl.userId = :userId AND cl.commentId IN :commentIds")
    List<UUID> findLikedCommentIds(UUID userId, List<UUID> commentIds);
}
