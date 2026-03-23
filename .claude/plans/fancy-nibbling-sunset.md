# Fix: Stale profile after influencer application

## Context
After submitting the influencer application, navigating back to `/become-host` still shows the form instead of redirecting to `/host/create`. Only a hard refresh fixes it.

**Root cause:** Backend Caffeine cache on profiles (1-minute TTL). `InfluencerApplicationService.submitApplication()` updates roles in the DB but never invalidates the profile cache. So the next `fetchProfile()` call gets the stale cached profile with `roles = {fan}`.

## Fix

### `backend/src/main/java/com/anicon/backend/service/InfluencerApplicationService.java`

After updating the profile roles (line 115), evict the profile cache entry for this user:

1. Inject Spring's `CacheManager`
2. After the `dsl.update(PROFILES)` call, evict the cache entry: `cacheManager.getCache("profiles").evict(userId)`

This ensures the next `fetchProfile()` from the frontend hits the DB and gets the fresh `roles = {influencer}`.

## Verification
1. Submit influencer application as a fan
2. Get redirected to homepage with success toast
3. Navigate to `/become-host` — should redirect to `/host/create` immediately (no hard refresh needed)
