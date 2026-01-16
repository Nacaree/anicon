# Quick Start Guide

## TL;DR - Get Backend Running in 5 Steps

### 1. Create Supabase Project
```
1. Go to https://supabase.com
2. Click "New Project"
3. Name it "anicon" (or whatever you want)
4. Wait 2 minutes for setup
```

### 2. Run Database Schema
```
1. In Supabase Dashboard → SQL Editor
2. Copy/paste entire contents of /schema.sql
3. Click "Run"
```

### 3. Get Your Credentials

**From Supabase → Settings → Database:**
```
Host: db.xxxxxxxxxxxxx.supabase.co
Database: postgres
User: postgres.xxxxxxxxxxxxx
Password: (your password)
Port: 5432
```

**From Supabase → Settings → API:**
```
Project URL: https://xxxxxxxxxxxxx.supabase.co
anon key: eyJhbGciOiJ... (long string)
JWT Secret: (⚠️ DIFFERENT from anon key - scroll down!)
```

### 4. Configure Backend

Edit `/backend/src/main/resources/application.properties`:

```properties
# Replace ONLY these 6 values:
spring.datasource.url=jdbc:postgresql://YOUR_DB_HOST:5432/postgres
spring.datasource.username=YOUR_DB_USER
spring.datasource.password=YOUR_DB_PASSWORD

supabase.jwt.secret=YOUR_JWT_SECRET
supabase.url=YOUR_PROJECT_URL
supabase.anon.key=YOUR_ANON_KEY
```

**Example (filled in):**
```properties
spring.datasource.url=jdbc:postgresql://db.abcdefghijk.supabase.co:5432/postgres
spring.datasource.username=postgres.abcdefghijk
spring.datasource.password=my_secure_password_123

supabase.jwt.secret=super-secret-jwt-string-from-supabase
supabase.url=https://abcdefghijk.supabase.co
supabase.anon.key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5. Run Backend

```bash
cd backend
mvn spring-boot:run
```

**Test it works:**
```bash
curl http://localhost:8080/api/health
```

**Should see:**
```json
{"status":"UP","service":"anicon-backend"}
```

---

## ✅ You're Done!

Backend is now running on `http://localhost:8080`

## 🔗 Connect Frontend

In your Next.js app, use:
```javascript
const API_URL = 'http://localhost:8080/api';

// Example: Create profile after Supabase signup
const { data: { user, session } } = await supabase.auth.signUp({
  email, password
});

// Create profile in backend
const response = await fetch(`${API_URL}/profiles`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: 'myusername',
    displayName: 'My Display Name'
  })
});
```

## 🆘 Common Issues

**"Cannot connect to database"**
```bash
# Check your credentials are correct
# Make sure you ran schema.sql
# Verify Supabase project is active
```

**"JWT validation failed"**
```bash
# You might be using the anon key instead of JWT secret
# Go to Supabase → Settings → API
# Scroll down to "JWT Settings"
# Copy "JWT Secret" (NOT the anon key)
```

**"Port 8080 already in use"**
```bash
# Change port in application.properties:
server.port=8081
```

## 📖 More Help

- `/backend/README.md` - Full documentation
- `/backend/SETUP_CHECKLIST.md` - Detailed checklist
- `/BACKEND_SETUP_COMPLETE.md` - Complete overview
