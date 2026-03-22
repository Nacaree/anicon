package com.anicon.backend.search.dto;

/**
 * A single trending hashtag with its post count.
 * Used by the "Trending now" sidebar section.
 */
public record HashtagResult(String hashtag, long postCount) {}
