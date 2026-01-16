# Supabase Setup Guide for AniCon

Complete step-by-step guide to set up Supabase for the AniCon backend.

## 📋 Overview

You'll be setting up:
1. Supabase project
2. PostgreSQL database with schema
3. Authentication
4. Getting credentials for backend

**Estimated time: 10-15 minutes**

---

## Step 1: Create Supabase Account & Project

### 1.1 Sign Up / Log In

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"Sign In"**
3. Sign up with:
   - GitHub (recommended)
   - Google
   - Email

### 1.2 Create New Project

1. After logging in, click **"New Project"**
2. Fill in the details:
   - **Name**: `anicon` (or whatever you prefer)
   - **Database Password**: Create a strong password
     - ⚠️ **SAVE THIS PASSWORD!** You'll need it later
     - Example: `AniCon2025SecurePass!`
   - **Region**: Choose closest to you
     - For Cambodia: `Southeast Asia (Singapore)`
   - **Pricing Plan**: Free (more than enough for development)

3. Click **"Create new project"**
4. **Wait 2-3 minutes** for the database to provision
   - You'll see a loading screen
   - Coffee break time ☕

---

## Step 2: Run Database Schema

### 2.1 Open SQL Editor

1. Once your project is ready, you'll see the dashboard
2. On the left sidebar, click **"SQL Editor"**
3. Click **"New query"** button

### 2.2 Copy Schema SQL

1. Open your local file `/Users/lamini/Development/anicon/schema.sql`
2. Copy **ALL** the contents (171 lines)
3. Paste into the Supabase SQL Editor

### 2.3 Run the Schema

1. Click the **"Run"** button (or press `Cmd + Enter`)
2. You should see success messages in the Results panel:
   - ✅ `CREATE TYPE user_role`
   - ✅ `CREATE TYPE application_status`
   - ✅ `CREATE TABLE profiles`
   - ✅ `CREATE TABLE follows`
   - ✅ `CREATE TABLE influencer_applications`
   - ✅ Multiple `CREATE INDEX` messages
   - ✅ `CREATE FUNCTION update_updated_at`
   - ✅ `CREATE TRIGGER` messages
   - ✅ `ALTER TABLE` for RLS
   - ✅ Multiple `CREATE POLICY` messages

3. If you see any errors:
   - Make sure you copied the ENTIRE schema.sql file
   - Try running it again (some commands are idempotent)

### 2.4 Verify Tables Created

1. Click **"Table Editor"** in the left sidebar
2. You should see 3 tables:
   - `profiles`
   - `follows`
   - `influencer_applications`

---

## Step 3: Get Database Credentials

### 3.1 Navigate to Database Settings

1. Click the **gear icon** (⚙️) at the bottom left
2. Click **"Database"** in the settings menu

### 3.2 Get Connection Details

Scroll down to **"Connection string"** section:

1. Click **"URI"** tab
2. You'll see something like:
   ```
   postgresql://postgres.xxxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```
postgresql://postgres.rsongscpipemetlknnkc:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres

3. **Copy these values:**
   - **Host**: `aws-0-us-east-1.pooler.supabase.com` (or your region)
     - Or use: `db.xxxxxxxxxxxxx.supabase.co` (Transaction mode)
   - **Database**: `postgres`
   - **User**: `postgres.xxxxxxxxxxxxx` (your project ref)
   - **Password**: The password you set in Step 1.2
   - **Port**: `5432` (use Transaction mode port, NOT 6543)

**For application.properties, use Transaction mode:**
```
Host: db.xxxxxxxxxxxxx.supabase.co
Port: 5432
```

**Better yet:** Click the **"Transaction Pooler"** mode toggle, and you'll see:
```
postgresql://postgres.xxxxxxxxxxxxx:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
```

---

## Step 4: Get API Credentials

### 4.1 Navigate to API Settings

1. Still in Settings (⚙️)
2. Click **"API"**

### 4.2 Copy Project URL

Under **"Project URL"**:
```
https://xxxxxxxxxxxxx.supabase.co
```
**Copy this!** You'll need it for `supabase.url`

### 4.3 Copy Anon Key

Under **"Project API keys"**:
- Find `anon` `public`
- Click the **copy icon** 📋
- It looks like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**Copy this!** You'll need it for `supabase.anon.key`

### 4.4 Copy JWT Secret ⚠️ IMPORTANT

Scroll down to **"JWT Settings"** section:
- Find **"JWT Secret"**
- Click **"Reveal"** button
- Click the **copy icon** 📋
- It's a long random string (NOT the same as anon key!)

**Copy this!** You'll need it for `supabase.jwt.secret`

⚠️ **Common Mistake**: Do NOT use the anon key for JWT secret!

---

## Step 5: Configure Backend

### 5.1 Open Configuration File

Open file:
```
/Users/lamini/Development/anicon/backend/src/main/resources/application.properties
```

### 5.2 Fill In Credentials

Replace the placeholder values:

```properties
# Database Configuration (Supabase PostgreSQL)
spring.datasource.url=jdbc:postgresql://db.xxxxxxxxxxxxx.supabase.co:5432/postgres
spring.datasource.username=postgres.xxxxxxxxxxxxx
spring.datasource.password=YOUR_DATABASE_PASSWORD

# Supabase JWT Configuration
supabase.jwt.secret=YOUR_JWT_SECRET_FROM_STEP_4.4
supabase.url=https://xxxxxxxxxxxxx.supabase.co
supabase.anon.key=YOUR_ANON_KEY_FROM_STEP_4.3
```

**Example (with fake values):**
```properties
# Database Configuration
spring.datasource.url=jdbc:postgresql://db.abcdefghijklmnop.supabase.co:5432/postgres
spring.datasource.username=postgres.abcdefghijklmnop
spring.datasource.password=AniCon2025SecurePass!

# Supabase JWT Configuration
supabase.jwt.secret=super-secret-jwt-string-32-chars-minimum-here
supabase.url=https://abcdefghijklmnop.supabase.co
supabase.anon.key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYyMzA0MjQwMCwiZXhwIjoxOTM4NjE4NDAwfQ.abcdefghijklmnopqrstuvwxyz123456789
```

### 5.3 Save the File

Press `Cmd + S` to save

---

## Step 6: Enable Authentication (Optional but Recommended)

### 6.1 Navigate to Authentication

1. Click **"Authentication"** in the left sidebar
2. Click **"Providers"**

### 6.2 Configure Email Provider

1. Find **"Email"** provider
2. Toggle it **ON**
3. Settings:
   - **Enable Email provider**: ON
   - **Confirm email**: ON (recommended for production)
   - **Secure email change**: ON

4. Click **"Save"**

### 6.3 Optional: Add Social Providers

You can also enable:
- Google OAuth
- GitHub OAuth
- Discord OAuth
- etc.

(Not required for now, can add later)

---

## Step 7: Test the Setup

### 7.1 Start Backend

```bash
cd /Users/lamini/Development/anicon/backend
mvn spring-boot:run
```

### 7.2 Check Logs

You should see:
```
Started AniconBackendApplication in X seconds
```

If you see errors like:
- `Connection refused` → Check database credentials
- `Authentication failed` → Check password
- `Unknown database` → Make sure you used `postgres` as database name

### 7.3 Test Health Endpoint

In a new terminal:
```bash
curl http://localhost:8080/api/health
```

**Expected response:**
```json
{"status":"UP","service":"anicon-backend"}
```

✅ **Success!** Your backend is connected to Supabase!

---

## Step 8: (Optional) Verify Database Content

### 8.1 Check Tables in Supabase

1. Go to **"Table Editor"** in Supabase
2. Click on **"profiles"** table
3. Initially empty (no rows)

### 8.2 Test Create Profile

You can test profile creation once you have frontend working, or use:

```bash
# First, you need a JWT token from Supabase Auth
# You can get one by signing up a test user in Supabase
```

---

## 🎯 Quick Reference: Where to Find Everything

| What you need | Where to find it |
|---------------|------------------|
| **Database Host** | Settings → Database → Connection String (Transaction mode) |
| **Database Password** | Password you created in Step 1.2 |
| **Project URL** | Settings → API → Project URL |
| **Anon Key** | Settings → API → Project API keys → anon |
| **JWT Secret** | Settings → API → JWT Settings → JWT Secret |

---

## 🔒 Security Best Practices

### DO:
✅ Keep your database password secure
✅ Use the JWT secret for backend validation
✅ Use the anon key for frontend (it's public)
✅ Enable Row Level Security (RLS) - already done in schema!
✅ Use environment variables in production (not hardcoded)

### DON'T:
❌ Commit credentials to Git
❌ Share JWT secret publicly
❌ Use the anon key for JWT validation
❌ Disable Row Level Security

---

## 🐛 Troubleshooting

### "Connection refused"

**Problem**: Can't connect to database

**Solutions**:
1. Check if you're using the correct host (Transaction mode, not Session)
2. Verify port is `5432` (not `6543`)
3. Check Supabase project is active (not paused)
4. Verify IP whitelist (Supabase Free tier allows all IPs)

### "Password authentication failed"

**Problem**: Wrong password

**Solutions**:
1. Double-check password (copy-paste to avoid typos)
2. Reset database password in Supabase Settings → Database
3. Make sure no special characters are breaking the connection string

### "JWT validation failed"

**Problem**: Backend can't validate tokens

**Solutions**:
1. Verify you're using JWT Secret (not anon key)
2. Check JWT secret is correctly copied (no extra spaces)
3. Ensure frontend is sending token as: `Authorization: Bearer <token>`

### "Unknown database: postgres"

**Problem**: Wrong database name

**Solutions**:
1. Always use `postgres` as database name
2. Don't use your project name as database name

### Backend starts but can't query database

**Problem**: Schema not run or RLS blocking queries

**Solutions**:
1. Re-run schema.sql in SQL Editor
2. Check Table Editor to verify tables exist
3. Check if Row Level Security is enabled (should be)

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Database Guide](https://supabase.com/docs/guides/database)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

## ✅ Checklist

Use this to track your progress:

- [ ] Created Supabase account
- [ ] Created new project
- [ ] Saved database password
- [ ] Ran schema.sql successfully
- [ ] Verified tables in Table Editor
- [ ] Copied database host
- [ ] Copied database username
- [ ] Copied Project URL
- [ ] Copied anon key
- [ ] Copied JWT secret
- [ ] Updated application.properties
- [ ] Started backend successfully
- [ ] Tested /api/health endpoint
- [ ] Enabled email authentication

---

## 🎉 Next Steps

Once Supabase is set up and backend is running:

1. **Test frontend signup/login** with Supabase Auth
2. **Create first profile** via POST /api/profiles
3. **Test follow system**
4. **Build out the UI**

Your backend is now connected to a production-grade PostgreSQL database with built-in authentication! 🚀
