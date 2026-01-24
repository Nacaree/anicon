# AniCon Backend - Planning Document (V2 - Trigger-Based Auth)

## Project Overview

AniCon is a centralized digital ecosystem connecting Cambodia's anime community through event ticketing and creator content.

### Tech Stack

- **Frontend:** Next.js (React)
- **Backend:** Spring Boot (Java)
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage
- **Auth:** Supabase Auth (JWT tokens validated by Spring Boot)
- **ORM:** Hybrid approach - Hibernate (simple CRUD) + JOOQ (complex queries, type safety)

---

## Authentication Flow

### Signup Flow

```
1. User fills form (email, password, username, display_name) in Next.js
2. Next.js calls supabase.auth.signUp({
     email,
     password,
     options: { data: { username, display_name } }
   })
3. Supabase creates a new user in the `auth.users` table.
4. A database trigger (`on_auth_user_created`) automatically fires.
5. The trigger's function (`handle_new_user`) reads the metadata (username, display_name) and inserts a new row into `public.profiles`.
6. Supabase returns a successful session to the Next.js client. The user and profile now exist atomically.
```

### Login Flow

```
1. User fills login form in Next.js
2. Next.js calls supabase.auth.signInWithPassword({ email, password })
3. Supabase returns JWT token
4. Next.js stores token, uses for all Spring Boot API calls
```

### API Request Flow

```
1. Next.js sends request with Authorization: Bearer <token>
2. Spring Boot validates JWT using Supabase JWT secret
3. If valid → process request
4. If invalid → return 401 Unauthorized
```

---

## Role System

### Roles (Capability-based, not hierarchical)

| Role         | Description          | How to Get                    |
| ------------ | -------------------- | ----------------------------- |
| `fan`        | Default role         | Everyone starts here          |
| `influencer` | Can host mini-events | Fan applies → admin approves  |
| `creator`    | Can receive gifts    | Admin assigns (big following) |
| `organizer`  | Can host big events  | Admin assigns                 |

### Valid Role Combinations

| roles[]                | Who                          |
| ---------------------- | ---------------------------- |
| `[fan]`                | Regular user                 |
| `[influencer]`         | Approved fan                 |
| `[creator]`            | Famous cosplayer/artist      |
| `[organizer]`          | Event company/group          |
| `[creator, organizer]` | Creator who also runs events |

### Role Rules

1. Everyone starts as `fan`
2. `fan` can apply → `influencer` (via application form)
3. Admin can assign `creator` (replaces fan/influencer)
4. Admin can assign `organizer`:
   - If already `creator` → becomes `[creator, organizer]`
   - If not `creator` → becomes `[organizer]` only
5. `organizer`-only accounts cannot become `creator` later

---

## Database Schema

### Enums

```sql
create type user_role as enum ('fan', 'influencer', 'creator', 'organizer');
create type application_status as enum ('pending', 'approved', 'rejected');
```

### profiles

Core user data, linked to Supabase auth.users.

```sql
create table profiles (
  -- Core
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null
    constraint username_format check (
      username ~ '^[a-zA-Z0-9_]{1,20}$'
    ),
  display_name text,
  avatar_url text,
  bio text,

  -- Roles
  roles user_role[] default '{fan}'
    constraint valid_role_combo check (
      roles = '{fan}' OR
      roles = '{influencer}' OR
      roles = '{creator}' OR
      roles = '{organizer}' OR
      roles = '{creator,organizer}' OR
      roles = '{organizer,creator}'
    ),

  -- Creator fields
  gift_link text,

  -- Influencer fields
  influencer_status application_status,
  influencer_verified_at timestamptz,

  -- Organizer fields
  organization_name text,
  is_verified_organizer boolean default false,

  -- Social links
  social_links jsonb default '{}',

  -- Metadata
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

**Username rules:**

- Max 20 characters
- Alphanumeric + underscore only
- No spaces

### follows

Internal follower system (calculated, not stored on profile).

```sql
create table follows (
  follower_id uuid references profiles(id) on delete cascade,
  following_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),

  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id != following_id)
);
```

### influencer_applications

Application history for influencer role.

```sql
create table influencer_applications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  status application_status default 'pending',

  -- Application data
  reason text not null,
  community_involvement text,
  follower_count integer default 0,
  social_proof_links jsonb default '{}',

  -- Review data
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  admin_notes text,

  -- Reapply logic (1 month cooldown if rejected)
  can_reapply_at timestamptz,

  -- Metadata
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

## Indexes

```sql
create unique index idx_profiles_username on profiles(username);
create index idx_profiles_roles on profiles using gin(roles);
create index idx_follows_follower on follows(follower_id);
create index idx_follows_following on follows(following_id);
create index idx_applications_profile on influencer_applications(profile_id);
create index idx_applications_status on influencer_applications(status);
```

---

## Triggers

```sql
-- Auto-update timestamp function
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on profiles
  for each row
  execute function update_updated_at();

create trigger applications_updated_at
  before update on influencer_applications
  for each row
  execute function update_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name, roles)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'display_name',
    '{fan}'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

## Common Queries

### Get follower count

```sql
select count(*) as follower_count
from follows
where following_id = :profile_id;
```

### Get following count

```sql
select count(*) as following_count
from follows
where follower_id = :profile_id;
```

### Check if user A follows user B

```sql
select exists(
  select 1 from follows
  where follower_id = :user_a
  and following_id = :user_b
) as is_following;
```

### Get profile with counts

```sql
select
  p.*,
  (select count(*) from follows where following_id = p.id) as follower_count,
  (select count(*) from follows where follower_id = p.id) as following_count
from profiles p
where p.id = :profile_id;
```

---

## Implementation Priority

### Phase 1: Login/Register (Current Focus)

- [x] Set up Supabase project
- [x] Create profiles table & triggers
- [ ] Set up Spring Boot project
- [ ] Configure Hibernate + JOOQ
- [ ] Build auth endpoints
- [ ] JWT validation filter

### Phase 2: Follows System

- [ ] Create follows table
- [ ] Follow/unfollow endpoints
- [ ] Follower count queries

### Phase 3: Influencer Applications

- [ ] Create influencer_applications table
- [ ] Application submission endpoint
- [ ] Admin review endpoints
- [ ] Reapply cooldown logic

---

## Notes

- Use Supabase Auth for password handling (don't roll your own)
- Use JOOQ for type-safe complex queries
- Use Hibernate/Spring Data JPA for simple CRUD
- Follower count is calculated, not stored
- All timestamps use `timestamptz` (timezone-aware)
