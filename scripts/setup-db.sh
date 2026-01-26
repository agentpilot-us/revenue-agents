#!/bin/bash
# Database Setup Script
# This creates the database tables needed for the app

echo "🔧 Setting up database tables..."

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_PRISMA_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_PRISMA_URL must be set"
  exit 1
fi

echo "✅ Environment variables loaded"

# Try to push schema to database
echo "📦 Pushing Prisma schema to database..."
npx prisma db push --accept-data-loss

if [ $? -eq 0 ]; then
  echo "✅ Database tables created successfully!"
  echo ""
  echo "📊 You can now:"
  echo "   - Run 'npm run dev' to start the app"
  echo "   - Run 'npm run db:studio' to view data"
else
  echo "❌ Failed to create tables"
  echo ""
  echo "💡 Troubleshooting:"
  echo "   1. Check if your Neon database is paused (visit Neon dashboard)"
  echo "   2. Verify DATABASE_URL is correct in .env.local"
  echo "   3. Try running: npx prisma migrate dev --name init"
  exit 1
fi
