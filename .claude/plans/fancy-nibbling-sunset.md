# Plan: Redirect to homepage with success toast after influencer application

## Context
The current influencer application flow shows a full "You're now an Influencer!" success page after submission. The user finds this goofy and wants a cleaner flow: submit → redirect to homepage → show a success snackbar.

The backend auto-approves applications immediately (thesis demo mode), so there's no pending state to worry about — the user becomes an influencer the moment they submit.

## Changes

### 1. Create `GlobalSuccessToast.js` (new file)
**File:** `frontend/src/components/GlobalSuccessToast.js`

- Clone `GlobalErrorToast.js` pattern but for success messages
- Listen for `"anicon-success"` custom events
- Green styling: `bg-green-500` with `shadow-[0_4px_20px_rgba(34,197,94,0.4)]`
- Use `CheckCircle` icon instead of `AlertCircle`
- Auto-dismiss after 4 seconds (same as error toast)
- Same positioning: fixed top-center

### 2. Register in `providers.js`
**File:** `frontend/src/app/providers.js`

- Import and render `<GlobalSuccessToast />` alongside `<GlobalErrorToast />`

### 3. Simplify `become-host/page.js` submit flow
**File:** `frontend/src/app/become-host/page.js`

- In `handleSubmit`: after successful submission + `fetchProfile()`, dispatch `"anicon-success"` event with message "You're now an Influencer!" and `router.push("/")`
- Remove the approved success screen (lines 214-239) — no longer needed since we redirect immediately
- Keep pending/rejected states as-is (they still make sense as fallbacks)

## Files to modify
1. `frontend/src/components/GlobalSuccessToast.js` — **CREATE** (clone of GlobalErrorToast with green styling)
2. `frontend/src/app/providers.js` — **MODIFY** (add GlobalSuccessToast)
3. `frontend/src/app/become-host/page.js` — **MODIFY** (redirect + dispatch success event on submit)

## Verification
1. Go to `/become-host` as a fan user
2. Fill out and submit the form
3. Should redirect to homepage with a green "You're now an Influencer!" toast at the top
4. Toast auto-dismisses after 4 seconds
5. Profile should reflect influencer role (already handled by `fetchProfile()`)
