# AniCon Backend

Spring Boot backend for AniCon - Cambodia's anime community platform.

## Tech Stack

- **Java 17+**
- **Spring Boot 3.2.1**
- **PostgreSQL** (via Supabase)
- **Spring Data JPA** (Hibernate)
- **JOOQ** (for complex queries)
- **JWT** (Supabase Auth)

## Prerequisites

Before running the backend, ensure you have:

1. **Java 17 or higher** installed
2. **Maven 3.9+** installed
3. **Supabase project** set up with the database schema

## Setup Instructions

### 1. Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL schema from `/schema.sql` in your Supabase SQL Editor
3. Note down your credentials:
   - Database URL
   - Database username
   - Database password
   - JWT secret
   - Supabase URL
   - Anon key

### 2. Configure Application Properties

Edit `src/main/resources/application.properties` and fill in your Supabase credentials:

```properties
# Database Configuration
spring.datasource.url=jdbc:postgresql://YOUR_SUPABASE_HOST:5432/postgres
spring.datasource.username=postgres.YOUR_PROJECT_REF
spring.datasource.password=YOUR_DB_PASSWORD

# Supabase JWT Configuration
supabase.jwt.secret=YOUR_JWT_SECRET
supabase.url=https://YOUR_PROJECT_REF.supabase.co
supabase.anon.key=YOUR_ANON_KEY
```

### 3. How to Get Supabase Credentials

**Database Connection:**
1. Go to Supabase Dashboard → Project Settings → Database
2. Connection string (Transaction Pooler mode) for Java:
   - Host: `aws-0-us-east-1.pooler.supabase.com`
   - Database: `postgres`
   - User: `postgres.YOUR_PROJECT_REF`
   - Password: Your database password
   - Port: `5432`

**JWT Secret:**
1. Go to Project Settings → API
2. Copy `JWT Secret` (not the anon key)

**Supabase URL & Keys:**
1. Go to Project Settings → API
2. Copy `Project URL`
3. Copy `anon` (public) key

### 4. Build and Run

```bash
# Navigate to backend folder
cd backend

# Install dependencies and build
mvn clean install

# Run the application
mvn spring-boot:run
```

The backend will start on `http://localhost:8080`

### 5. Test the API

```bash
# Health check (no auth required)
curl http://localhost:8080/api/health

# Response: {"status":"UP","service":"anicon-backend"}
```

## API Endpoints

### Public Endpoints

- `GET /api/health` - Health check

### Protected Endpoints (Require JWT)

**Profiles:**
- `POST /api/profiles` - Create user profile
- `GET /api/profiles/me` - Get current user profile
- `GET /api/profiles/{username}` - Get profile by username
- `GET /api/profiles/user/{userId}` - Get profile by ID

**Follows:**
- `POST /api/follows/{userId}` - Follow a user
- `DELETE /api/follows/{userId}` - Unfollow a user
- `GET /api/follows/{userId}/status` - Check if following
- `GET /api/follows/{userId}/counts` - Get follower/following counts

## Authentication Flow

1. User signs up/logs in via Supabase Auth (handled by Next.js frontend)
2. Frontend receives JWT token
3. Frontend sends requests with `Authorization: Bearer <token>` header
4. Backend validates JWT and extracts user ID
5. Backend processes request with authenticated user context

## Project Structure

```
backend/
├── src/main/java/com/anicon/backend/
│   ├── config/           # Configuration classes
│   ├── controller/       # REST controllers
│   ├── dto/             # Data Transfer Objects
│   ├── entity/          # JPA entities
│   ├── exception/       # Exception handlers
│   ├── repository/      # JPA repositories
│   ├── security/        # Security filters
│   └── service/         # Business logic
├── src/main/resources/
│   └── application.properties
└── pom.xml              # Maven dependencies
```

## Development

```bash
# Run in development mode with hot reload
mvn spring-boot:run

# Run tests
mvn test

# Package as JAR
mvn package
```

## Troubleshooting

### "Could not connect to database"
- Check your Supabase database credentials
- Ensure your IP is whitelisted in Supabase (or disable restrictions)
- Verify the connection string format

### "JWT validation failed"
- Ensure you're using the JWT secret, not the anon key
- Check token expiration
- Verify token format: `Authorization: Bearer <token>`

### "Username already taken"
- Usernames must be unique across all users
- Try a different username

## Next Steps

- [ ] Set up Supabase project
- [ ] Configure application.properties
- [ ] Run database migrations (schema.sql)
- [ ] Test with frontend
- [ ] Deploy to production

## License

Proprietary - AniCon
