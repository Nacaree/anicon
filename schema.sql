-- AniCon Database Schema
-- Run this in Supabase SQL Editor

-- ============================================
-- ENUMS
-- ============================================

create type user_role as enum ('fan', 'influencer', 'creator', 'organizer');
create type application_status as enum ('pending', 'approved', 'rejected');

-- ============================================
-- TABLES
-- ============================================

-- Profiles (linked to Supabase auth.users)
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

-- Follows (internal follower system)
create table follows (
  follower_id uuid references profiles(id) on delete cascade,
  following_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  
  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id != following_id)
);

-- Influencer Applications
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

-- ============================================
-- INDEXES
-- ============================================

create unique index idx_profiles_username on profiles(username);
create index idx_profiles_roles on profiles using gin(roles);
create index idx_follows_follower on follows(follower_id);
create index idx_follows_following on follows(following_id);
create index idx_applications_profile on influencer_applications(profile_id);
create index idx_applications_status on influencer_applications(status);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update timestamp function
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers
create trigger profiles_updated_at
  before update on profiles
  for each row
  execute function update_updated_at();

create trigger applications_updated_at
  before update on influencer_applications
  for each row
  execute function update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (Optional but recommended)
-- ============================================

-- Enable RLS
alter table profiles enable row level security;
alter table follows enable row level security;
alter table influencer_applications enable row level security;

-- Profiles: Users can read all, update only their own
create policy "Profiles are viewable by everyone"
  on profiles for select
  using (true);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- Follows: Users can read all, manage only their own follows
create policy "Follows are viewable by everyone"
  on follows for select
  using (true);

create policy "Users can follow others"
  on follows for insert
  with check (auth.uid() = follower_id);

create policy "Users can unfollow"
  on follows for delete
  using (auth.uid() = follower_id);

-- Applications: Users can read own, create own
create policy "Users can view own applications"
  on influencer_applications for select
  using (auth.uid() = profile_id);

create policy "Users can create applications"
  on influencer_applications for insert
  with check (auth.uid() = profile_id);
