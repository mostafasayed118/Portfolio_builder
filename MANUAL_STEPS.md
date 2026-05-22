# Manual Steps Required — Backend Security Fixes Round 2

After implementing all automated fixes, complete these manual steps in order.

---

## Step 1: Update Environment Variables

**What:** Remove `VITE_` prefix from service role key to prevent client-side exposure.

**How:**
1. Open your `.env` file (root directory)
2. Find `VITE_SUPABASE_SERVICE_ROLE_KEY`
3. Rename to `SUPABASE_SERVICE_ROLE_KEY` (remove `VITE_` prefix)
4. Do the same in `.env.example` if it exists
5. Update any production environment variables (Vercel, Railway, etc.)

**Before:**
```
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

**After:**
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

---

## Step 2: Run Migration 035 — Drop Duplicate Constraints/Index

**What:** Removes duplicate UNIQUE constraint on `projects.slug` and duplicate indexes.

**How:**
```bash
# Option A: Using psql directly
psql -h your-supabase-host -U postgres -d postgres -f supabase/migrations/035_drop_duplicates.sql

# Option B: Using Supabase Dashboard
# 1. Go to Supabase Dashboard → SQL Editor
# 2. Copy contents of supabase/migrations/035_drop_duplicates.sql
# 3. Click "Run"
```

---

## Step 3: Run Migration 036 — Fix description_ar Type

**What:** Converts `experience.description_ar` from TEXT to TEXT[] to match the `description` column.

**How:**
```bash
psql -f supabase/migrations/036_fix_description_ar.sql
```

Or in Supabase Dashboard → SQL Editor, paste and run the migration.

---

## Step 4: Verify and Run Migration 037 — Drop Legacy Table

**What:** Drops the `contact_messages` table (consolidated into `messages` in migration 028).

**How:**
```bash
# FIRST: Check if table has data
psql -c "SELECT COUNT(*) FROM contact_messages;"

# If count = 0, run the migration:
psql -f supabase/migrations/037_cleanup.sql

# If count > 0, migrate data to messages table first!
```

---

## Step 5: Run Migration 038 — Snapshot Constraints

**What:** Adds CHECK constraint on `content_snapshots.entity_type`.

**How:**
```bash
psql -f supabase/migrations/038_snapshot_constraints.sql
```

---

## Step 6: Regenerate TypeScript Types

**What:** Sync `lib/supabase/src/types.ts` with current database schema.

**How:**
```bash
# Option A: Using Supabase CLI
npx supabase gen types typescript --local > lib/supabase/src/types.ts

# Option B: Using Supabase Dashboard
# 1. Go to Supabase Dashboard → Settings → API
# 2. Click "Generate TypeScript Types"
# 3. Copy the generated types
# 4. Paste into lib/supabase/src/types.ts
```

---

## Step 7: Promote Your Account to Superadmin

**What:** Give your admin account superadmin role for user management features.

**How:**
```bash
cd artifacts/api-server
npx tsx src/scripts/promote-superadmin.ts al3tar66@gmail.com
```

**Prerequisites:**
- You must have logged in at least once (so your user row exists)
- SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env

---

## Step 8: Verify section_variants RLS (Optional)

**What:** Check if `section_variants` table needs public read access restored.

**How:**
```sql
-- Run in Supabase SQL Editor:
SELECT policyname, cmd, roles, qual
FROM pg_policies
WHERE tablename = 'section_variants';
```

If no public SELECT policy exists and the frontend needs it, run:
```sql
CREATE POLICY "public_read_variants" ON section_variants
  FOR SELECT USING (true);
```

---

## Verification Checklist

After completing all steps:

- [ ] `.env` has `SUPABASE_SERVICE_ROLE_KEY` (no VITE_ prefix)
- [ ] Migration 035 ran successfully
- [ ] Migration 036 ran successfully
- [ ] Migration 037 ran successfully (or skipped if data exists)
- [ ] Migration 038 ran successfully
- [ ] Types regenerated in `lib/supabase/src/types.ts`
- [ ] Your account has superadmin role
- [ ] API server starts without errors
- [ ] All tests pass: `cd artifacts/api-server && npx vitest run`

---

## Quick Reference — Migration Order

```bash
# Run in this order:
psql -f supabase/migrations/035_drop_duplicates.sql
psql -f supabase/migrations/036_fix_description_ar.sql
psql -f supabase/migrations/037_cleanup.sql  # Verify empty first!
psql -f supabase/migrations/038_snapshot_constraints.sql
```

---

## Troubleshooting

**Migration fails with "relation does not exist":**
- The table may have been renamed or dropped. Check the migration history.

**Migration fails with "constraint does not exist":**
- The constraint may have already been dropped. Safe to skip.

**promote-superadmin.ts fails with "User not found":**
- Log in to the admin panel first, then run the script again.

**Tests fail after changes:**
- Run `npx vitest run` to see which tests are failing
- Check that all mocks are properly set up in `src/test/setup.ts`
