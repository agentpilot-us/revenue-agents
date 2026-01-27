# How to Fix Database Schema Mismatch

## The Problem
Your database is missing the `subscriptionId`, `subscriptionStatus`, and `subscriptionTier` columns in the `User` table.

## Solution: Reset Database Schema

### Step 1: Open Neon SQL Editor
1. Go to your Neon dashboard: https://console.neon.tech
2. Select your project: `revenue-agents-db`
3. Click on **"SQL Editor"** in the left sidebar
4. Make sure you're on the `main` branch

### Step 2: Run the Reset Script
1. Open the file `reset-database.sql` in this project
2. **Copy the entire contents** of the file
3. **Paste it into the Neon SQL Editor**
4. Click **"Run"** or press `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)

### Step 3: Verify It Worked
After running, you should see:
- ✅ All tables dropped and recreated
- ✅ User table now has `subscriptionId`, `subscriptionStatus`, `subscriptionTier` columns
- ✅ All foreign keys and indexes created

The script includes a verification query at the end that will show you the subscription columns.

### Step 4: Regenerate Prisma Client
After the database is reset, run:
```bash
npx prisma generate
```

### Step 5: Test Your App
```bash
npm run dev
```

The `User.subscriptionId` error should now be gone! ✅

## Alternative: Add Columns Manually (If you have data to preserve)

If you have important data and don't want to reset, you can add the missing columns:

```sql
ALTER TABLE "User" 
ADD COLUMN "subscriptionId" TEXT,
ADD COLUMN "subscriptionStatus" TEXT,
ADD COLUMN "subscriptionTier" TEXT;

CREATE UNIQUE INDEX "User_subscriptionId_key" ON "User"("subscriptionId") WHERE "subscriptionId" IS NOT NULL;
```

But since you mentioned resetting, the full reset script is recommended.
