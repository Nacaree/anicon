# CLAUDE.md

This file provides context for Claude Code when working on the AniCon backend.

## Project Summary

AniCon is a platform for Cambodia's anime community - event ticketing, creator content, and community features.

## Tech Stack

- **Backend:** Spring Boot 3.2+ (Java 21)
- **Frontend:** Next.js (In this REPOSITORY)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth with JWT validation in Spring Boot
- **ORM:** Hybrid - Hibernate (simple CRUD) + JOOQ (complex queries)

## Key Files

- `PLANNING2.md` - Full planning document with auth flows, role system, and entity designs
- `schema.sql` - Complete database schema ready to run in Supabase

## Current Phase

**Phase 1: Login/Register**

Focus on:

1. Spring Boot project setup
2. Supabase connection
3. Hibernate + JOOQ configuration
4. JWT validation filter
5. Profile creation on signup

## Database Entities (Phase 1)

| Table                     | Purpose                                  |
| ------------------------- | ---------------------------------------- |
| `auth.users`              | Supabase-managed, handles email/password |
| `profiles`                | User data - username, roles, etc.        |
| `follows`                 | Who follows who (build later)            |
| `influencer_applications` | Role applications (build later)          |

## Role System

Valid roles: `fan`, `influencer`, `creator`, `organizer`

Valid combinations:

- `[fan]` - default
- `[influencer]` - approved fan
- `[creator]` - admin-assigned
- `[organizer]` - admin-assigned
- `[creator, organizer]` - only combo allowed

## Commands

```zsh
# Generate JOOQ types after schema changes
./mvnw jooq-codegen:generate

# Run the app
./mvnw spring-boot:run

# Run tests
./mvnw test
```

## Important Notes

- Username: max 20 chars, alphanumeric + underscore only
- Follower/following counts are denormalized (stored on `profiles`, updated atomically on follow/unfollow)
- Use `timestamptz` for all timestamps
- All terminal commands should be zsh compatible (macOS)
- Respect all .claudeignore entries without exception
- NEVER read or process .env files
