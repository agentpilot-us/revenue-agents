-- Run this in Neon SQL Editor to verify Session table structure
-- This will show you the exact columns in your Session table

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'Session'
ORDER BY ordinal_position;

-- Expected columns for Session table:
-- id (text, NOT NULL, PRIMARY KEY)
-- sessionToken (text, NOT NULL, UNIQUE)
-- userId (text, NOT NULL, FOREIGN KEY to User.id)
-- expires (timestamp, NOT NULL)

-- If columns don't match, you can fix with:
-- ALTER TABLE "Session" RENAME COLUMN "old_column_name" TO "new_column_name";
-- Or drop and recreate (if no important data):
-- DROP TABLE IF EXISTS "Session" CASCADE;
-- Then run the CREATE TABLE from sync-database.md
