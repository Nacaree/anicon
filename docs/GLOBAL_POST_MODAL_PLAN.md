# Global Post Modal — Open Posts from Any Page (Facebook-style)

## Context
Currently, clicking a notification navigates to the home page before opening the post modal. The user wants Facebook-like behavior: clicking a notification opens the post modal as an overlay on whatever page you're currently on, without navigating away.

## Current Problems
- `PostDetailModal` only lives on the home page (`page.js`) and profile page (`HomeTab.js`) — duplicated in both
- Notification clicks must navigate to `/` first if not already there, with a fragile 500ms `setTimeout`
- Shared post links (`/posts/{id}`) redirect to `/?post={id}` — only works on home
- The `anicon-open-post` event is only listened to on the home page

## Approach: Global PostModalContext
Follow the existing `AuthGateModal` pattern — create a context provider that renders the modal globally.

### 1. Create `PostModalContext` (`frontend/src/context/PostModalContext.js`)
- State: `post`, `isOpen`
- Methods: `openPost(postId)` — fetches post and opens modal, `openPostDirect(post)` — opens with existing data, `closePost()`
- Listens for `anicon-open-post` custom events globally
- Checks `?post={id}` query param on mount
- Renders `PostDetailModal` inside the provider

### 2. Add to `providers.js` (`frontend/src/app/providers.js`)
- Wrap children with `PostModalProvider` (like `AuthGateProvider`)
- Modal renders at provider level, visible on every page

### 3. Simplify `NotificationItem.jsx`
- Remove the `pathname === "/"` branch and `setTimeout` hack
- Just dispatch `anicon-open-post` event — context handles it everywhere

### 4. Simplify `/posts/[id]/page.js`
- Instead of redirecting to `/?post={id}`, just dispatch the event or use context directly

### 5. Remove duplication
- Remove `PostDetailModal` + `detailPost` state from `page.js` (home)
- Remove `PostDetailModal` + `detailPost` state from `HomeTab.js` (profile)
- Both use `usePostModal().openPost(postId)` instead

### Files to modify:
- `frontend/src/context/PostModalContext.js` — **new**
- `frontend/src/app/providers.js` — add PostModalProvider
- `frontend/src/app/page.js` — remove local modal state, use context
- `frontend/src/components/profile/HomeTab.js` — remove local modal state, use context
- `frontend/src/components/notifications/NotificationItem.jsx` — simplify click handler
- `frontend/src/app/posts/[id]/page.js` — use context instead of redirect

### Verification
1. Click notification on profile page → modal opens on profile page (no navigation)
2. Click notification on events page → modal opens on events page
3. Click shared post link → modal opens on current page
4. Click post in feed → modal opens (same as before)
5. Close modal → back to whatever page you were on
