# Database Setup - Fix Missing Tables Error

## ❌ Current Error

You're seeing these errors because the database tables don't exist yet:
- `The column (not available) does not exist`
- `AdapterError` in NextAuth
- `PrismaClientKnownRequestError` when querying Session table

## ✅ These Errors WILL Block Production

Without the database tables, your app will:
- ❌ Fail to authenticate users
- ❌ Crash on every page load
- ❌ Not be able to store any data

## 📝 Note: Prisma 7 vs Vercel Example

**Important:** Vercel's example shows `url = env("DATABASE_URL")` in `schema.prisma`, but **Prisma 7.3.0 doesn't allow this**. 

Our setup is correct for Prisma 7:
- ✅ `schema.prisma` - No `url` (Prisma 7 requirement)
- ✅ `prisma.config.ts` - Connection URLs here (for migrations)
- ✅ `PrismaClient` - Automatically reads from `DATABASE_URL` env var

This is the correct Prisma 7 configuration!

## 🔧 Fix: Create Database Tables

### Option 1: Using Prisma Migrate (Recommended)

```bash
# 1. Make sure your database is accessible
# (Neon databases may need to be "woken up" - just visit your Neon dashboard)

# 2. Load environment variables and run migration
npx dotenv -e .env.local -- npx prisma migrate dev --name init
```

### Option 2: Using Prisma DB Push (Faster, for development)

```bash
# 1. Load environment variables and push schema
npx prisma db push
```

Or use the setup script:
```bash
./scripts/setup-db.sh
```

### Option 3: Manual SQL (If migrations fail)

If the above don't work, you can run the SQL directly in your Neon dashboard:

1. Go to your Neon dashboard
2. Open the SQL Editor
3. Run the generated SQL from Prisma:

```bash
# Generate SQL without applying
npx dotenv -e .env.local -- npx prisma migrate dev --create-only --name init
# Then copy the SQL from prisma/migrations/.../migration.sql
```

## 🔍 Troubleshooting

### Database Connection Fails

If you see `Can't reach database server`:

1. **Neon Database Paused?**
   - Visit your Neon dashboard
   - The database may be paused after inactivity
   - Click "Resume" or make a query to wake it up

2. **Check Connection String**
   ```bash
   # Verify your connection string is correct
   cat .env.local | grep POSTGRES_PRISMA_URL
   ```

3. **Test Connection**
   ```bash
   # Try connecting directly
   psql "$(grep POSTGRES_PRISMA_URL .env.local | cut -d'=' -f2)"
   ```

### Prisma Config Issues

If `prisma db push` says "url is required":

1. Make sure `prisma.config.ts` exists and has:
   ```typescript
   export default defineConfig({
     schema: 'prisma/schema.prisma',
     datasource: {
       url: process.env.POSTGRES_PRISMA_URL,
       directUrl: process.env.POSTGRES_URL_NON_POOLING,
     },
   });
   ```

2. Make sure `.env.local` has both variables set

## ✅ Verify Tables Were Created

After running migrations, verify:

```bash
# Check if tables exist
npx dotenv -e .env.local -- npx prisma studio
# Or query directly:
npx dotenv -e .env.local -- npx prisma db execute --stdin <<< "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"
```

You should see:
- `Account`
- `Session`
- `User`
- `VerificationToken`
- `Purchase`
- `Download`

## 🚀 For Production (Vercel)

1. **Set environment variables in Vercel:**
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NON_POOLING`

2. **Run migrations in production:**
   ```bash
   # In Vercel, add a build command or run manually:
   npx prisma migrate deploy
   ```

   Or add to `package.json`:
   ```json
   {
     "scripts": {
       "postinstall": "prisma generate",
       "vercel-build": "prisma generate && prisma migrate deploy && next build"
     }
   }
   ```

## 📝 Next Steps After Fixing

1. ✅ Run migration locally
2. ✅ Verify tables exist
3. ✅ Test app - errors should be gone
4. ✅ Commit and push
5. ✅ Set up production migrations in Vercel
