# Backend Setup Checklist

## ✅ What's Been Created

### Project Structure
- [x] Maven project with Spring Boot 3.2.1
- [x] Java package structure
- [x] Configuration files
- [x] Entity models
- [x] Repositories
- [x] Services
- [x] REST Controllers
- [x] Security configuration

### Files Created (Total: 22 files)

**Configuration:**
- `pom.xml` - Maven dependencies
- `application.properties` - Main config
- `application-dev.properties` - Dev config
- `.gitignore`

**Main Application:**
- `AniconBackendApplication.java` - Spring Boot entry point

**Config Classes:**
- `CorsConfig.java` - CORS settings
- `SecurityConfig.java` - Security settings

**Security:**
- `JwtAuthenticationFilter.java` - JWT validation

**Entities (Database Models):**
- `Profile.java` - User profiles
- `Follow.java` - Follow relationships
- `InfluencerApplication.java` - Influencer applications
- `UserRole.java` - Role enum
- `ApplicationStatus.java` - Application status enum

**Repositories:**
- `ProfileRepository.java`
- `FollowRepository.java`
- `InfluencerApplicationRepository.java`

**DTOs:**
- `CreateProfileRequest.java`
- `ProfileResponse.java`

**Services:**
- `ProfileService.java`
- `FollowService.java`

**Controllers:**
- `ProfileController.java`
- `FollowController.java`
- `HealthController.java`

**Exception Handling:**
- `GlobalExceptionHandler.java`

**Documentation:**
- `README.md`
- `SETUP_CHECKLIST.md` (this file)

## 🔧 What You Need to Install/Setup

### 1. ✅ Already Installed
- [x] Java 25 (compatible, but uses Java 17 target)
- [x] Maven 3.9.12

### 2. ⚠️ Required Setup

#### A. Supabase Project
You need to:
1. Create a Supabase project at https://supabase.com
2. Run the `/schema.sql` file in Supabase SQL Editor
3. Get the following credentials:

**From Supabase Dashboard → Project Settings → Database:**
- Database Host (e.g., `db.xxxxx.supabase.co`)
- Database Name: `postgres`
- Database User: `postgres.your-project-ref`
- Database Password: (your password)

**From Supabase Dashboard → Project Settings → API:**
- Project URL: `https://xxxxx.supabase.co`
- Anon Key: `eyJhbGc...` (public key)
- JWT Secret: `your-jwt-secret` (⚠️ different from anon key!)

#### B. Configure application.properties

Edit `/backend/src/main/resources/application.properties` and replace placeholders:

```properties
# Replace these values:
spring.datasource.url=jdbc:postgresql://<YOUR_DB_HOST>:5432/postgres
spring.datasource.username=<YOUR_DB_USER>
spring.datasource.password=<YOUR_DB_PASSWORD>

supabase.jwt.secret=<YOUR_JWT_SECRET>
supabase.url=<YOUR_SUPABASE_URL>
supabase.anon.key=<YOUR_ANON_KEY>
```

### 3. 🚀 Running the Backend

After configuration:

```bash
cd backend
mvn spring-boot:run
```

Test it works:
```bash
curl http://localhost:8080/api/health
# Should return: {"status":"UP","service":"anicon-backend"}
```

## 📋 Dependencies Included

### Core Spring Boot
- `spring-boot-starter-web` - REST API
- `spring-boot-starter-data-jpa` - Database ORM
- `spring-boot-starter-security` - Security & auth
- `spring-boot-starter-validation` - Input validation

### Database
- `postgresql` - PostgreSQL driver
- `jooq` - Type-safe SQL queries

### JWT & Auth
- `jjwt-api`, `jjwt-impl`, `jjwt-jackson` - JWT token handling

### Development
- `lombok` - Reduce boilerplate code
- `spring-boot-devtools` - Hot reload

### Testing
- `spring-boot-starter-test` - Testing framework

## 🔐 Security Features

- JWT token validation from Supabase
- CORS configuration for frontend
- Protected endpoints (require authentication)
- Public endpoints (/api/health)

## 📝 API Endpoints Summary

### Public (No Auth)
- `GET /api/health` - Health check

### Protected (Requires JWT)
- `POST /api/profiles` - Create profile
- `GET /api/profiles/me` - Get my profile
- `GET /api/profiles/{username}` - Get profile by username
- `POST /api/follows/{userId}` - Follow user
- `DELETE /api/follows/{userId}` - Unfollow user
- `GET /api/follows/{userId}/status` - Check follow status
- `GET /api/follows/{userId}/counts` - Get follower counts

## ⚠️ Important Notes

1. **Java Version**: Project uses Java 17 target, but your Java 25 is compatible
2. **Database**: Must run `schema.sql` in Supabase BEFORE starting backend
3. **JWT Secret**: Use the JWT Secret from API settings, NOT the anon key
4. **CORS**: Currently allows `http://localhost:3000` for Next.js dev server
5. **Port**: Backend runs on port 8080

## 🐛 Common Issues

**Issue**: "Cannot connect to database"
**Fix**: Check Supabase credentials, ensure IP is whitelisted

**Issue**: "JWT validation failed"
**Fix**: Verify you're using JWT Secret, not anon key

**Issue**: "Port 8080 already in use"
**Fix**: Change port in application.properties: `server.port=8081`

## ✅ Next Steps

1. [ ] Create Supabase project
2. [ ] Run schema.sql in Supabase
3. [ ] Get all credentials from Supabase
4. [ ] Update application.properties
5. [ ] Run `mvn spring-boot:run`
6. [ ] Test with `curl http://localhost:8080/api/health`
7. [ ] Connect frontend to backend
