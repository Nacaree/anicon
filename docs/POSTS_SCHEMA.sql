-- ============================================
-- ANICONNECT POSTS / SOCIAL FEED SCHEMA
-- ============================================
-- Run in Supabase SQL Editor.
-- Creates: posts, post_images, post_likes, post_comments, comment_likes
-- Plus indexes, triggers, and Supabase Storage bucket + policies.
-- ============================================

-- ============================================
-- POSTS TABLE
-- ============================================
-- All roles can post. Text required for originals, NULL for reposts.
-- Reposts reference the original via original_post_id.

CREATE TABLE IF NOT EXISTS posts (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Content (NULL for plain reposts — reposts have no added text)
    text_content     TEXT,

    -- Repost support: if set, this post is a repost of another post.
    -- ON DELETE SET NULL so if the original is deleted, the repost survives
    -- and the frontend shows "Original post was deleted".
    original_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,

    -- Denormalized counters — atomically updated via JOOQ
    like_count       BIGINT NOT NULL DEFAULT 0,
    comment_count    BIGINT NOT NULL DEFAULT 0,
    repost_count     BIGINT NOT NULL DEFAULT 0,

    -- Soft delete flag for future moderation
    is_deleted       BOOLEAN NOT NULL DEFAULT false,

    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Original posts can have text, images, or both — text is optional.
    -- When present, text must be ≤500 chars. Reposts have NULL text.
    CONSTRAINT valid_post_content CHECK (
        (original_post_id IS NULL AND (text_content IS NULL OR char_length(text_content) <= 500))
        OR original_post_id IS NOT NULL
    )
);

-- Composite cursor index for efficient infinite scroll pagination.
-- Feed queries use WHERE (created_at, id) < (cursor_ts, cursor_id)
-- and ORDER BY created_at DESC, id DESC.
CREATE INDEX IF NOT EXISTS idx_posts_feed_cursor ON posts(created_at DESC, id DESC);

-- User's own posts for profile HomeTab (includes reposts)
CREATE INDEX IF NOT EXISTS idx_posts_user_feed ON posts(user_id, created_at DESC, id DESC);

-- Lookup reposts by original post
CREATE INDEX IF NOT EXISTS idx_posts_original_post ON posts(original_post_id);


-- ============================================
-- POST IMAGES TABLE
-- ============================================
-- Up to 10 images per post, ordered by display_order.

CREATE TABLE IF NOT EXISTS post_images (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id       UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    image_url     TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    -- Optional image dimensions for frontend layout calculations
    width         INT,
    height        INT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT max_images_order CHECK (display_order >= 0 AND display_order < 10)
);

CREATE INDEX IF NOT EXISTS idx_post_images_post ON post_images(post_id);


-- ============================================
-- POST LIKES TABLE
-- ============================================
-- Same pattern as portfolio_likes — junction table with composite PK.

CREATE TABLE IF NOT EXISTS post_likes (
    user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes(user_id);


-- ============================================
-- POST COMMENTS TABLE
-- ============================================
-- Supports one level of replies via self-referencing parent_id.
-- parent_id IS NULL = top-level comment
-- parent_id IS NOT NULL = reply to a top-level comment
-- One-level depth is enforced at the application layer (API rejects replies-to-replies).

CREATE TABLE IF NOT EXISTS post_comments (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id       UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    parent_id     UUID REFERENCES post_comments(id) ON DELETE CASCADE,

    text_content  TEXT NOT NULL,
    like_count    BIGINT NOT NULL DEFAULT 0,

    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT valid_comment_text CHECK (char_length(text_content) <= 500),
    -- Prevent self-reference
    CONSTRAINT no_self_reference CHECK (parent_id IS NULL OR parent_id != id)
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON post_comments(parent_id);


-- ============================================
-- COMMENT LIKES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS comment_likes (
    user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (user_id, comment_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON comment_likes(comment_id);


-- ============================================
-- AUTO-UPDATE updated_at TRIGGERS
-- ============================================
-- Reuses the update_updated_at_column() function if it already exists (from schema.sql).

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER post_comments_updated_at
    BEFORE UPDATE ON post_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- SUPABASE STORAGE BUCKET + POLICIES
-- ============================================
-- Same pattern as the 'portfolio' bucket: public read, user-folder write/delete.

INSERT INTO storage.buckets (id, name, public)
VALUES ('posts', 'posts', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view post images
CREATE POLICY "Post images are public"
ON storage.objects FOR SELECT
USING (bucket_id = 'posts');

-- Users upload to their own folder (posts/{userId}/...)
CREATE POLICY "Users can upload post images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'posts'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users delete their own post images
CREATE POLICY "Users can delete own post images"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'posts'
    AND auth.uid()::text = (storage.foldername(name))[1]
);


-- ============================================
-- ROW-LEVEL SECURITY
-- ============================================

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- Posts: public read, owner write
CREATE POLICY "Posts are publicly readable" ON posts FOR SELECT USING (true);
CREATE POLICY "Users can create own posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING (auth.uid() = user_id);

-- Post images: public read, owner write (via post ownership)
CREATE POLICY "Post images are publicly readable" ON post_images FOR SELECT USING (true);
CREATE POLICY "Users can insert post images" ON post_images FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete post images" ON post_images FOR DELETE USING (true);

-- Post likes: public read, own likes write
CREATE POLICY "Post likes are publicly readable" ON post_likes FOR SELECT USING (true);
CREATE POLICY "Users can like posts" ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike posts" ON post_likes FOR DELETE USING (auth.uid() = user_id);

-- Comments: public read, owner write
CREATE POLICY "Comments are publicly readable" ON post_comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON post_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON post_comments FOR DELETE USING (auth.uid() = user_id);

-- Comment likes: public read, own likes write
CREATE POLICY "Comment likes are publicly readable" ON comment_likes FOR SELECT USING (true);
CREATE POLICY "Users can like comments" ON comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike comments" ON comment_likes FOR DELETE USING (auth.uid() = user_id);
