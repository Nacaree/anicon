package com.anicon.backend.social;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PostImageRepository extends JpaRepository<PostImage, UUID> {

    List<PostImage> findByPostIdOrderByDisplayOrderAsc(UUID postId);

    /**
     * Batch-fetch images for multiple posts at once.
     * Avoids N+1 when loading a feed page.
     */
    List<PostImage> findByPostIdInOrderByPostIdAscDisplayOrderAsc(List<UUID> postIds);
}
