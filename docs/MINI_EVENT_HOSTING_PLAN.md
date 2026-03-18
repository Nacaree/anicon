# Feature 4: Mini-Event Hosting — Implementation Plan

## Overview

Allow **verified hosts** (users with the `influencer` role) to create small-scale community meetups in public spaces. These are always free, casual gatherings like watch parties, cosplay photoshoots, or trading card meetups.

**Difficulty: 3/10** — Mostly CRUD with role-based access control. No payments involved.

---

## Key Insight: Build on Existing Infrastructure

Your codebase already has most of the pieces:

| What You Need | What Already Exists |
|---------------|---------------------|
| Verified host concept | `influencer` role in profiles |
| Host application flow | `influencer_applications` table + JPA entity |
| Mini-event storage | `events` table with `type = 'mini_event'` |
| Permission enforcement | `EventService` already gates mini_event creation to influencers |
| RSVP system | `event_rsvps` table + endpoints already working |

**What's missing:** Frontend UI for the application flow and mini-event creation form.

---

## User Flows

### Flow 1: Becoming a Verified Host

```
Fan wants to host meetups
        ↓
Goes to /become-host (or profile settings)
        ↓
Fills application form:
   - Why do you want to host? (textarea)
   - Social media links (optional)
   - Community involvement (textarea)
        ↓
POST /api/influencer-applications
        ↓
Application saved with status = 'pending'
        ↓
You (admin) review manually in Supabase dashboard
        ↓
UPDATE profiles SET roles = '["influencer"]' WHERE id = ?
        ↓
User can now create mini-events
```

### Flow 2: Creating a Mini-Event

```
Verified host (influencer) logs in
        ↓
Sees "Host a Meetup" button on /events or profile
        ↓
Fills form:
   - Title (required, max 100 chars)
   - Description (required, max 1000 chars)
   - Date (required)
   - Time (required)
   - Location name (required, e.g., "Brown Coffee, BKK1")
   - Location address (optional, for Google Maps link)
   - Max capacity (optional, default null = unlimited)
        ↓
POST /api/events with:
   {
     "title": "...",
     "description": "...",
     "eventDate": "2025-04-15",
     "eventTime": "14:00",
     "location": "Brown Coffee, BKK1",
     "locationAddress": "Street 308, Phnom Penh",
     "type": "mini_event",
     "maxCapacity": 15
   }
        ↓
Backend validates: user has influencer role, type is mini_event
        ↓
Event created (ticket_price forced to 0, is_free = true)
        ↓
Appears in /events listing with "Community Meetup" badge
```

### Flow 3: Attending a Mini-Event

```
Any user browses /events
        ↓
Sees mini-event with "Community Meetup" tag
        ↓
Clicks to view details
        ↓
Sees: title, description, host profile, date/time, location
        ↓
Clicks "I'm Going" (existing RSVP flow)
        ↓
POST /api/tickets/rsvp/{eventId} (already implemented!)
        ↓
Shows up in their /my-events or similar
```

---

## Database Changes

### Option A: No Schema Changes (Recommended)

The existing schema already supports this. Just use:
- `events.type = 'mini_event'`
- `events.location` for venue name
- Add `location_address` column if you want structured address data

### Option B: Add Location Address Column (If Needed)

```sql
-- Run in Supabase SQL Editor
ALTER TABLE events 
ADD COLUMN location_address text;

COMMENT ON COLUMN events.location_address IS 
  'Optional street address for Google Maps linking';
```

### Influencer Applications Table (Already Exists)

Verify you have this table — if not, create it:

```sql
-- Check if exists first
CREATE TABLE IF NOT EXISTS influencer_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  social_links text,
  community_involvement text,
  status varchar(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, status) -- Prevent duplicate pending applications
);

CREATE INDEX idx_influencer_applications_status ON influencer_applications(status);
CREATE INDEX idx_influencer_applications_user ON influencer_applications(user_id);
```

---

## Backend Implementation

### Files to Create/Modify

```
backend/src/main/java/com/anicon/backend/
├── controller/
│   └── InfluencerApplicationController.java  // NEW
├── service/
│   └── InfluencerApplicationService.java     // NEW
├── repository/
│   └── InfluencerApplicationRepository.java  // May already exist
├── entity/
│   └── InfluencerApplication.java            // May already exist
└── dto/
    ├── InfluencerApplicationRequest.java     // NEW
    └── InfluencerApplicationResponse.java    // NEW
```

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/influencer-applications` | Required | Submit host application |
| `GET` | `/api/influencer-applications/my` | Required | Get current user's application status |
| `GET` | `/api/influencer-applications` | Admin only | List all pending applications (future) |
| `PUT` | `/api/influencer-applications/{id}/approve` | Admin only | Approve application (future) |

### InfluencerApplicationController.java

```java
@RestController
@RequestMapping("/api/influencer-applications")
@RequiredArgsConstructor
public class InfluencerApplicationController {

    private final InfluencerApplicationService applicationService;

    /**
     * Submit an application to become a verified host (influencer).
     * Users can only have one pending application at a time.
     */
    @PostMapping
    public ResponseEntity<InfluencerApplicationResponse> apply(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @Valid @RequestBody InfluencerApplicationRequest request) {
        
        var application = applicationService.submitApplication(
            principal.getUserId(), 
            request
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(application);
    }

    /**
     * Check the current user's application status.
     * Returns 404 if they haven't applied.
     */
    @GetMapping("/my")
    public ResponseEntity<InfluencerApplicationResponse> getMyApplication(
            @AuthenticationPrincipal SupabaseUserPrincipal principal) {
        
        return applicationService.getApplicationByUserId(principal.getUserId())
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}
```

### InfluencerApplicationRequest.java

```java
public record InfluencerApplicationRequest(
    @NotBlank(message = "Please tell us why you want to host events")
    @Size(max = 1000)
    String reason,
    
    @Size(max = 500)
    String socialLinks,  // Optional: Instagram, Facebook, etc.
    
    @Size(max = 1000)
    String communityInvolvement  // Optional: past events, groups, etc.
) {}
```

### InfluencerApplicationResponse.java

```java
public record InfluencerApplicationResponse(
    UUID id,
    UUID userId,
    String reason,
    String socialLinks,
    String communityInvolvement,
    String status,  // "pending", "approved", "rejected"
    Instant createdAt,
    Instant reviewedAt
) {}
```

### Event Creation (Already Works, Just Verify)

The existing `EventService.createEvent()` should already:
1. Check if user has `influencer` role when `type = "mini_event"`
2. Force `ticketPrice = 0` and `isFree = true` for mini_events
3. Save to events table

If not, add this validation in `EventService`:

```java
// In createEvent() method
if ("mini_event".equals(request.getType())) {
    // Verify user is influencer
    if (!userHasRole(userId, "influencer")) {
        throw new ForbiddenException("Only verified hosts can create mini-events");
    }
    // Force free event
    request.setTicketPrice(BigDecimal.ZERO);
    request.setIsFree(true);
}
```

---

## Frontend Implementation

### Files to Create

```
frontend/src/app/
├── become-host/
│   └── page.js                    // Host application form
├── host/
│   └── create/
│       └── page.js                // Create mini-event form
└── components/
    ├── HostApplicationForm.jsx    // Form component
    ├── MiniEventForm.jsx          // Create event form
    └── MiniEventBadge.jsx         // "Community Meetup" tag
```

### Page: /become-host

Simple form for fans to apply:

```jsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function BecomeHostPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Already an influencer? Redirect
  if (profile?.roles?.includes('influencer')) {
    router.push('/host/create');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.target);
    
    try {
      await api.post('/api/influencer-applications', {
        reason: formData.get('reason'),
        socialLinks: formData.get('socialLinks'),
        communityInvolvement: formData.get('communityInvolvement'),
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 text-center">
        <h1 className="text-2xl font-bold text-green-600">Application Submitted!</h1>
        <p className="mt-4 text-muted-foreground">
          We'll review your application and get back to you soon.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6">
      <h1 className="text-2xl font-bold">Become a Verified Host</h1>
      <p className="mt-2 text-muted-foreground">
        Host community meetups, watch parties, and small gatherings.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium">
            Why do you want to host events? *
          </label>
          <textarea
            name="reason"
            required
            rows={4}
            className="mt-1 w-full rounded-md border p-2"
            placeholder="Tell us about the events you'd like to organize..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium">
            Social media links (optional)
          </label>
          <input
            name="socialLinks"
            type="text"
            className="mt-1 w-full rounded-md border p-2"
            placeholder="Instagram, Facebook, etc."
          />
        </div>

        <div>
          <label className="block text-sm font-medium">
            Community involvement (optional)
          </label>
          <textarea
            name="communityInvolvement"
            rows={3}
            className="mt-1 w-full rounded-md border p-2"
            placeholder="Past events you've organized, communities you're part of..."
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white py-2 rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit Application'}
        </button>
      </form>
    </div>
  );
}
```

### Page: /host/create

Form for verified hosts to create mini-events:

```jsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

// Common meetup locations in Cambodia
const SUGGESTED_LOCATIONS = [
  'Brown Coffee',
  'Starbucks',
  'Amazon Coffee',
  'AEON Mall Food Court',
  'TK Avenue',
  'Exchange Square',
  'Boba Tea Shop',
  'Board Game Cafe',
  'Riverside Park',
];

export default function CreateMiniEventPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Must be influencer to access
  if (profile && !profile.roles?.includes('influencer')) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 text-center">
        <h1 className="text-xl font-bold">Not Authorized</h1>
        <p className="mt-2 text-muted-foreground">
          You need to be a verified host to create meetups.
        </p>
        <a href="/become-host" className="mt-4 inline-block text-primary underline">
          Apply to become a host →
        </a>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.target);

    try {
      const response = await api.post('/api/events', {
        title: formData.get('title'),
        description: formData.get('description'),
        eventDate: formData.get('date'),
        eventTime: formData.get('time'),
        location: formData.get('location'),
        locationAddress: formData.get('locationAddress'),
        type: 'mini_event',
        maxCapacity: formData.get('maxCapacity') 
          ? parseInt(formData.get('maxCapacity')) 
          : null,
      });

      router.push(`/events/${response.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto mt-10 p-6">
      <h1 className="text-2xl font-bold">Host a Meetup</h1>
      <p className="mt-2 text-muted-foreground">
        Create a free community gathering for anime fans.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium">Event Title *</label>
          <input
            name="title"
            type="text"
            required
            maxLength={100}
            className="mt-1 w-full rounded-md border p-2"
            placeholder="e.g., Naruto Watch Party, Cosplay Photoshoot"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Description *</label>
          <textarea
            name="description"
            required
            rows={4}
            maxLength={1000}
            className="mt-1 w-full rounded-md border p-2"
            placeholder="What's the meetup about? What should people bring?"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Date *</label>
            <input
              name="date"
              type="date"
              required
              min={new Date().toISOString().split('T')[0]}
              className="mt-1 w-full rounded-md border p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Time *</label>
            <input
              name="time"
              type="time"
              required
              className="mt-1 w-full rounded-md border p-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Location *</label>
          <input
            name="location"
            type="text"
            required
            list="location-suggestions"
            className="mt-1 w-full rounded-md border p-2"
            placeholder="e.g., Brown Coffee, BKK1"
          />
          <datalist id="location-suggestions">
            {SUGGESTED_LOCATIONS.map((loc) => (
              <option key={loc} value={loc} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="block text-sm font-medium">
            Street Address (optional)
          </label>
          <input
            name="locationAddress"
            type="text"
            className="mt-1 w-full rounded-md border p-2"
            placeholder="For Google Maps link"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">
            Max Attendees (optional)
          </label>
          <input
            name="maxCapacity"
            type="number"
            min={2}
            max={50}
            className="mt-1 w-full rounded-md border p-2"
            placeholder="Leave empty for no limit"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Recommended: 5-20 for a cozy meetup
          </p>
        </div>

        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white py-2 rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Meetup'}
        </button>
      </form>
    </div>
  );
}
```

### Component: MiniEventBadge.jsx

```jsx
export function MiniEventBadge() {
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
      🎉 Community Meetup
    </span>
  );
}
```

### Update Event Card to Show Badge

In your existing event card component, add:

```jsx
{event.type === 'mini_event' && <MiniEventBadge />}
```

---

## Implementation Checklist

### Phase 1: Backend (Day 1)

- [ ] Verify `influencer_applications` table exists in Supabase
- [ ] Add `location_address` column to events table (optional)
- [ ] Create `InfluencerApplicationController.java`
- [ ] Create `InfluencerApplicationService.java`
- [ ] Create DTOs for request/response
- [ ] Verify `EventService` enforces mini_event rules
- [ ] Test endpoints with Postman/curl

### Phase 2: Frontend - Application Flow (Day 1-2)

- [ ] Create `/become-host` page
- [ ] Add link to become-host in user menu/profile
- [ ] Show application status if pending
- [ ] Redirect influencers to create page

### Phase 3: Frontend - Event Creation (Day 2)

- [ ] Create `/host/create` page
- [ ] Add role check (influencer only)
- [ ] Connect to existing POST /api/events
- [ ] Add suggested locations datalist
- [ ] Test full flow

### Phase 4: Display & Polish (Day 2)

- [ ] Create MiniEventBadge component
- [ ] Add badge to event cards
- [ ] Add badge to event detail page
- [ ] Filter events by type (optional: "Meetups" tab)

### Phase 5: Admin Review (Manual for MVP)

- [ ] Review applications in Supabase dashboard
- [ ] Update user roles via SQL:
  ```sql
  UPDATE profiles 
  SET roles = '["influencer"]' 
  WHERE id = '<user-uuid>';
  ```

---

## Future Enhancements (Not MVP)

1. **Admin dashboard** — Review applications in-app instead of Supabase
2. **Attendee list** — Show who's coming to the host
3. **Chat/comments** — Discussion thread for each meetup
4. **Recurring events** — "Every Saturday at Brown Coffee"
5. **Location picker** — Google Maps integration
6. **Host ratings** — Let attendees rate the experience
7. **Cancellation flow** — Let hosts cancel and notify attendees

---

## Testing Commands

```zsh
# Backend - run tests
cd backend
./mvnw test -Dtest=InfluencerApplicationControllerTest

# Backend - manual test
curl -X POST http://localhost:8080/api/influencer-applications \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "I want to host watch parties", "socialLinks": "@myig"}'

# Frontend - run dev
cd frontend
npm run dev
# Visit http://localhost:3000/become-host
```

---

## Time Estimate

| Task | Time |
|------|------|
| Backend (application + verify event creation) | 3-4 hours |
| Frontend (both pages + badge) | 4-5 hours |
| Testing & polish | 1-2 hours |
| **Total** | **8-11 hours** (1-2 days) |

---

## Notes

- The `influencer` role IS your "verified host" concept — no new role needed
- Mini-events use the existing `events` table — no new table needed
- RSVP flow already works — just reuse POST /api/tickets/rsvp/{eventId}
- Manual approval via Supabase is fine for MVP (you'll have <100 applications)
