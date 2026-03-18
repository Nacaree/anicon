# Social Posts Feature — Progress

## Summary

This session implemented the full social posts system (create, like, comment, repost) with an Instagram-style post detail modal, follow system enhancements, and various UI polish.

---

## What Was Done

### Backend — Posts & Comments

1. **Social sub-package** (`com.anicon.backend.social/`) — full CRUD for posts, comments, likes, reposts:
   - `PostController` + `PostService` — create (text + images), edit, delete, like/unlike, repost/undo-repost, feed
   - `CommentController` + `CommentService` — add/delete comments, like/unlike comments, nested replies
   - JPA entities: `Post`, `PostImage`, `PostComment`, `PostLike`, `CommentLike`
   - Repositories for all entities

2. **JOOQ codegen** — regenerated for new tables: `posts`, `post_images`, `post_likes`, `post_comments`, `comment_likes`

3. **GlobalExceptionHandler fix** — was returning "Already registered for this event" for ALL `DataIntegrityViolationException`. Now checks constraint name (`unique_rsvp`) and returns generic message for other violations.

4. **SecurityConfig** — added `permitAll()` for social endpoints and user events

### Backend — Follow System Enhancements

5. **FollowController** — new endpoints:
   - `GET /api/follows/{userId}/followers` — paginated followers list
   - `GET /api/follows/{userId}/following` — paginated following list

6. **FollowService** — enhanced with follower/following list queries returning `FollowUserResponse` DTO with user details

7. **FollowUserResponse DTO** — new response type with id, username, displayName, avatarUrl, isFollowedByCurrentUser

### Frontend — Posts System

8. **Post components** (`frontend/src/components/posts/`):
   - `PostComposer` — create posts with text and/or images
   - `PostComposerModal` — modal wrapper with discard confirmation
   - `PostCard` — feed card with author header, text (expand/collapse), image carousel, action bar
   - `PostActions` — like, comment, repost buttons with counts
   - `PostFeed` — paginated post list
   - `PostImageCarousel` — CSS scroll-snap carousel with IntersectionObserver, arrow nav, dot indicators
   - `ImageUploadGrid` — drag-to-reorder image upload preview in composer
   - `PostDetail` — standalone post detail page (`/posts/[id]`)
   - `PostDetailModal` — Instagram-style modal (side-by-side for images, single-column for text-only)
   - `CommentSection` — comment list + input, fetches on mount
   - `CommentCard` — single comment with like, reply, delete, nested replies
   - `CommentInput` — auto-expanding textarea for comments

9. **PostDetailModal design**:
   - Posts with images: side-by-side layout (image fixed left, comments scrollable right)
   - Text-only posts: single-column layout
   - Styled delete confirmation modal (no browser `confirm()`)
   - URL pushState for shareability (`/posts/[id]`)
   - Optimistic like/repost updates

10. **PostImageCarousel — Facebook-style natural sizing**:
    - Small images display at natural size, not stretched
    - `max-w-full` instead of `w-full` (no upscaling)
    - Black background, centered images
    - Works in both feed cards and detail modal

11. **Main page** (`app/page.js`) — integrated PostComposerModal + PostFeed + PostDetailModal

12. **Profile HomeTab** — added PostFeed + PostDetailModal to match main page behavior

### Frontend — Follow System

13. **FollowButton component** — standalone follow/unfollow button with optimistic updates
14. **FollowListModal** — modal showing followers/following lists with follow buttons
15. **Profile page** — integrated follow list modal on follower/following count click

### Frontend — API Layer

16. **`postsApi`** in `api.js` — full API client for posts, comments, likes, reposts
17. **`followApi`** additions — `getFollowers()`, `getFollowing()` endpoints

### Frontend — UI Polish

18. **CommentCard** — styled delete confirmation modal (matches post delete modal pattern)
19. **Comment replies** — removed left border line from reply tree
20. **CommentSection** — removed skeleton loader, added `noBorder` prop
21. **PostCard** — shortened menu text ("Edit"/"Delete" instead of "Edit post"/"Delete post")
22. **ProfileTabs** — redesigned tab navigation
23. **Various components** — dialog, modal, and spacing improvements

---

## Database Schema

New tables added (see `docs/POSTS_SCHEMA.sql`):
- `posts` — text content, author, repost support (original_post_id)
- `post_images` — multiple images per post with ordering
- `post_likes` — post like tracking
- `post_comments` — threaded comments (parent_id for replies)
- `comment_likes` — comment like tracking

### Pending DB Change

Run in Supabase SQL Editor to allow image-only posts:
```sql
ALTER TABLE posts DROP CONSTRAINT valid_post_content;
ALTER TABLE posts ADD CONSTRAINT valid_post_content CHECK (
    (original_post_id IS NULL AND (text_content IS NULL OR char_length(text_content) <= 500))
    OR original_post_id IS NOT NULL
);
```

---

## File Structure

```
backend/src/main/java/com/anicon/backend/
├── social/
│   ├── PostController.java
│   ├── PostService.java
│   ├── Post.java
│   ├── PostImage.java
│   ├── PostImageRepository.java
│   ├── PostLike.java
│   ├── PostLikeRepository.java
│   ├── PostRepository.java
│   ├── PostComment.java
│   ├── PostCommentRepository.java
│   ├── CommentController.java
│   ├── CommentService.java
│   ├── CommentLike.java
│   ├── CommentLikeRepository.java
│   └── dto/
├── dto/
│   └── FollowUserResponse.java

frontend/src/components/posts/
├── PostComposer.js
├── PostComposerModal.js
├── PostCard.js
├── PostActions.js
├── PostFeed.js
├── PostImageCarousel.js
├── ImageUploadGrid.js
├── PostDetail.js
├── PostDetailModal.js
├── CommentSection.js
├── CommentCard.js
└── CommentInput.js

frontend/src/components/
├── FollowButton.js
└── FollowListModal.js
```
