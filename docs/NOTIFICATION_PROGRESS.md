# Notification System — Implementation Progress

## Summary

Real-time notification system using WebSocket (STOMP) with HTTP polling fallback. Notifications are triggered by social interactions (likes, comments, reposts, follows) and delivered instantly to connected users.

---

## Architecture

```
User Action (like/comment/follow/repost)
    → Service publishes NotificationEvent via ApplicationEventPublisher
    → @TransactionalEventListener fires AFTER transaction commits
    → NotificationEventHandler (async):
        1. Persists notification to DB (upsert — dedup on actor+type+target)
        2. Pushes via STOMP WebSocket to /user/{recipientId}/queue/notifications
    → Frontend receives real-time push (or falls back to polling every 30s)
```

### Backend Stack
- **WebSocket**: Spring Boot Starter WebSocket + STOMP protocol
- **Auth**: JWT validated on STOMP CONNECT frame via `WebSocketAuthInterceptor`
- **Events**: `@Async @TransactionalEventListener(AFTER_COMMIT)` — non-blocking, rollback-safe
- **Persistence**: JPA entity + JdbcTemplate for queries (avoids JOOQ SQL grammar issues)
- **Upsert**: `ON CONFLICT (actor_id, type, target_id) DO UPDATE SET is_read = false, created_at = now()`

### Frontend Stack
- **WebSocket Client**: `@stomp/stompjs` — native WebSocket with auto-reconnect
- **Fallback**: HTTP polling every 30s if WebSocket fails
- **UI**: Radix Popover dropdown from bell icon in Header
- **Navigation**: Post notifications open PostDetailModal (like Facebook), profile notifications use router.push

---

## 7 Notification Types

| Type | Trigger | Recipient | Frontend Action |
|------|---------|-----------|-----------------|
| `like_post` | Someone likes your post | Post owner | Open post detail modal |
| `comment_post` | Someone comments on your post | Post owner | Open post detail modal |
| `reply_comment` | Someone replies to your comment | Comment owner | Open post detail modal |
| `like_comment` | Someone likes your comment | Comment owner | Open post detail modal |
| `repost_post` | Someone reposts your post | Post owner | Open post detail modal |
| `like_portfolio` | Someone likes your portfolio item | Item owner | Navigate to actor's profile |
| `follow_user` | Someone follows you | Followed user | Navigate to actor's profile |

**Rules:**
- Never notify yourself (checked in `NotificationEventHandler`)
- Delete notification on unlike/unfollow (via `NotificationService.deleteNotification()`)
- Upsert prevents duplicates on like→unlike→like cycles

---

## Database Schema

```sql
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type            VARCHAR(30) NOT NULL,
  target_id       UUID NOT NULL,
  reference_id    UUID,           -- post_id for comment notifications
  is_read         BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_duplicate_notification UNIQUE (actor_id, type, target_id)
);

CREATE INDEX idx_notif_recipient_unread ON notifications(recipient_id, is_read, created_at DESC);
CREATE INDEX idx_notif_recipient_count ON notifications(recipient_id) WHERE is_read = false;
```

---

## Backend Files

### New Package: `com.anicon.backend.notification`

| File | Purpose |
|------|---------|
| `Notification.java` | JPA entity |
| `NotificationRepository.java` | Spring Data JPA (count unread, find by recipient, mark all read) |
| `NotificationService.java` | Create (upsert via JDBC), query (JDBC), mark read, delete |
| `NotificationController.java` | REST endpoints (GET notifications, GET unread count, PATCH read) |
| `NotificationEvent.java` | Spring event record (actorId, recipientId, type, targetId, referenceId) |
| `NotificationEventHandler.java` | Async listener — persists + pushes via STOMP |
| `dto/NotificationResponse.java` | Response DTO with actor profile info |
| `dto/UnreadCountResponse.java` | `{ unreadCount: N }` |

### New Config Files

| File | Purpose |
|------|---------|
| `config/AsyncConfig.java` | `@EnableAsync` for async event handling |
| `config/WebSocketConfig.java` | STOMP broker, `/ws` endpoint, SockJS fallback, CORS |
| `config/WebSocketAuthInterceptor.java` | JWT auth on STOMP CONNECT via `SupabaseJwtValidator` |

### Modified Services (event wiring)

| Service | Events Published | Cleanup on Undo |
|---------|-----------------|-----------------|
| `PostService.java` | `like_post` in likePost(), `repost_post` in repost() | deleteNotification in unlikePost(), undoRepost() |
| `CommentService.java` | `comment_post` or `reply_comment` in addComment(), `like_comment` in likeComment() | deleteNotification in unlikeComment() |
| `FollowService.java` | `follow_user` in followUser() | deleteNotification in unfollowUser() |
| `PortfolioService.java` | `like_portfolio` in likeItem() | deleteNotification in unlikeItem() |

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/notifications?limit=20&offset=0` | Required | Recent notifications with actor profile info |
| `GET` | `/api/notifications/unread-count` | Required | Unread count for bell badge |
| `PATCH` | `/api/notifications/{id}/read` | Required | Mark one notification as read |
| `PATCH` | `/api/notifications/read-all` | Required | Mark all as read |
| WebSocket | `/ws` | JWT on CONNECT | STOMP endpoint for real-time push |

---

## Frontend Files

### New Files

| File | Purpose |
|------|---------|
| `src/components/notifications/NotificationDropdown.jsx` | Bell icon + Radix Popover with notification list |
| `src/components/notifications/NotificationItem.jsx` | Single notification row (avatar, action text, time, unread dot) |
| `src/lib/hooks/useNotificationCount.js` | STOMP WebSocket subscription + polling fallback |
| `src/components/ui/popover.jsx` | Shadcn Popover component (installed via CLI) |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/api.js` | Added `notificationApi` (getNotifications, getUnreadCount, markAsRead, markAllRead), exported `getCachedToken()` and `getApiBaseUrl()` |
| `src/components/Header.js` | Replaced static bell icon with `NotificationDropdown` component |
| `src/app/page.js` | Added `anicon-open-post` event listener to open PostDetailModal from notifications |
| `src/components/profile/HomeTab.js` | Added edit post flow (editingPost state, onEdit prop on detail modal) |
| `package.json` | Added `@stomp/stompjs` dependency |

---

## Other Changes in This Session

### Post Edit Flow
- `PostComposerModal` now supports editing (pre-fills text + images, calls `postsApi.updatePost`)
- `PostCard` and `PostDetailModal` Edit buttons wire through to the composer
- Backend `UpdatePostRequest` accepts `imageUrls` list, `PostService.updatePost()` replaces images

### Delete Confirmation Modals (unified design)
All delete/discard modals now use the "Not going?" Dialog design with orange "Keep" + red "Delete/Discard" pill buttons:
- `PostCard` — delete post confirmation
- `PostDetailModal` — delete post confirmation
- `CommentCard` — delete comment confirmation
- `PortfolioCard` — delete portfolio item confirmation
- `PostComposerModal` — discard post confirmation

### Commission System Removed
- Deleted: `CommissionStatusBadge.js`, `CommissionMenu.js`, `CommissionEditModal.js`
- Removed from: Profile entity, ProfileResponse DTO, CreatorService, RoleChecker, roles.js, profile page, settings page
- SQL to run: `ALTER TABLE profiles DROP COLUMN IF EXISTS commission_status; ALTER TABLE profiles DROP COLUMN IF EXISTS commission_info;`

### Repost Like/Repost State
- PostCard and PostDetailModal correctly show liked/reposted state for reposted posts
- Feed re-fetches after auth resolves to get accurate state on hard refresh

### Comment Section Fix
- `CommentSection` uses `key={postId}` on mount to prevent stale comments showing when switching posts

### Post Image Fixes
- Image container has rounded corners (`rounded-xl` on PortfolioCard, `rounded-[14px]` on PostCard)
- PostDetailModal constrains tall images with `max-w-[calc(100%-400px)]`
- Removed border between image and comment areas in detail modal
