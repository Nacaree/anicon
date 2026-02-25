# AniCon - Anime Community Platform

## Project Overview

AniCon is a full-stack web application designed as an anime community platform for Cambodia. It features a modern Next.js frontend and a robust Spring Boot backend, utilizing Supabase for database and authentication services.

### Tech Stack

*   **Frontend**: Next.js 16 (React 19), Tailwind CSS 4, Radix UI.
*   **Backend**: Java 17+, Spring Boot 3.2.1, Spring Data JPA, JOOQ.
*   **Database**: PostgreSQL (hosted via Supabase).
*   **Authentication**: Supabase Auth (JWT), integrated with Spring Security.

## Architecture & Directory Structure

*   **`/backend`**: The Spring Boot server API.
    *   `src/main/java/com/anicon/backend`: Source code.
        *   `controller`: REST API endpoints.
        *   `service`: Business logic.
        *   `repository`: Data access layers (JPA).
        *   `entity`: Database models.
        *   `security`: JWT authentication filters.
    *   `src/main/resources/application.properties`: Main configuration file (Supabase credentials).
*   **`/frontend`**: The Next.js client application.
    *   `src/app`: App Router pages and layouts.
    *   `src/components`: Reusable UI components.
    *   `src/lib`: Utilities and Supabase client initialization.
*   **`schema.sql`**: Database schema definition for Supabase (Profiles, Follows, Applications).

## Getting Started

### Prerequisites

*   **Java 17+** and **Maven 3.9+**.
*   **Node.js 18+** and **npm**.
*   **Supabase Project**: You need a Supabase project set up.

### Database Setup

1.  Create a project on [Supabase](https://supabase.com).
2.  Run the contents of `schema.sql` in the Supabase SQL Editor to create tables and policies.
3.  Obtain your **Database URL**, **JWT Secret**, **Project URL**, and **Anon Key**.

### Backend Setup

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Configure `src/main/resources/application.properties` with your Supabase credentials:
    ```properties
    spring.datasource.url=jdbc:postgresql://<HOST>:5432/postgres
    spring.datasource.username=postgres.<PROJECT_REF>
    spring.datasource.password=<PASSWORD>
    supabase.jwt.secret=<JWT_SECRET>
    supabase.url=<PROJECT_URL>
    supabase.anon.key=<ANON_KEY>
    ```
3.  Install dependencies:
    ```bash
    mvn clean install
    ```
4.  Run the application:
    ```bash
    mvn spring-boot:run
    ```
    The backend runs on `http://localhost:8080`.

### Frontend Setup

1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Run the development server:
    ```bash
    npm run dev
    ```
    The frontend runs on `http://localhost:3000`.

## Current Implementation Status

### Backend
*   **Auth**: JWT validation via Supabase Auth is implemented.
*   **Profiles**: Create, read, and update profiles.
*   **Follows**: Follow/unfollow logic and counts.
*   **Influencer Applications**: Entity and repository exist; endpoints are **TODO**.

### Frontend
*   Initialized with Next.js 16 and Tailwind CSS.
*   Standard scaffolding.

## Development Conventions

*   **API Design**: RESTful endpoints.
*   **Security**: All protected endpoints require a valid Bearer token (JWT) from Supabase.
*   **Database**: Use `schema.sql` as the source of truth for database structure.
*   **Code Style**:
    *   **Java**: Standard Spring Boot conventions (Controller -> Service -> Repository).
    *   **JavaScript/React**: Functional components, Hooks, Tailwind utility classes.

## Important Files

*   `backend/README.md`: Detailed backend documentation.
*   `BACKEND_SETUP_COMPLETE.md`: Summary of completed backend features.
*   `schema.sql`: Database schema and RLS policies.
