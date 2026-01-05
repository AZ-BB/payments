# User Authorization Migration Guide

This guide explains how to add user-based data isolation to the Tawakol application.

## Overview

After this migration, each user account will only see and manage their own data (incomes, payments, and credit boxes). This is achieved through:

1. Adding `user_id` columns to all tables
2. Implementing Row Level Security (RLS) policies
3. Updating application code to filter by user

## Database Migration Steps

### 1. Run the Migration SQL

Execute the SQL file `add-user-id-migration.sql` in your Supabase SQL editor:

```sql
-- This will:
-- 1. Add user_id columns to incomes, payments, and credit_boxes tables
-- 2. Create foreign key relationships to auth.users
-- 3. Update RLS policies to filter by user_id
-- 4. Create unique constraint on credit_boxes (user_id, box_type)
```

### 2. Handle Existing Data (if any)

If you have existing data in your tables, you'll need to assign it to users. You can either:

**Option A: Assign all existing data to a specific user**
```sql
-- Replace 'USER_ID_HERE' with an actual user ID from auth.users
UPDATE incomes SET user_id = 'USER_ID_HERE' WHERE user_id IS NULL;
UPDATE payments SET user_id = 'USER_ID_HERE' WHERE user_id IS NULL;
UPDATE credit_boxes SET user_id = 'USER_ID_HERE' WHERE user_id IS NULL;
```

**Option B: Delete existing data (if starting fresh)**
```sql
DELETE FROM incomes;
DELETE FROM payments;
DELETE FROM credit_boxes;
```

### 3. Make user_id NOT NULL (Optional but Recommended)

After assigning existing data, you can make user_id required:

```sql
ALTER TABLE incomes ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE payments ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE credit_boxes ALTER COLUMN user_id SET NOT NULL;
```

## Application Code Changes

The following files have been updated to support user-based data isolation:

### Updated Files:
- `src/pages/Income.jsx` - Filters incomes by user_id
- `src/pages/Payments.jsx` - Filters payments by user_id
- `src/pages/Credit.jsx` - Filters credit boxes by user_id

### Key Changes:
1. All queries now filter by `user_id = user.id`
2. All inserts include `user_id: user.id`
3. Real-time subscriptions filter by user_id
4. Credit boxes now use composite unique key (user_id, box_type)

## How It Works

### Row Level Security (RLS)

RLS policies automatically filter data based on the authenticated user:

- **SELECT**: Users can only see their own records
- **INSERT**: New records automatically get the current user's ID
- **UPDATE**: Users can only update their own records
- **DELETE**: Users can only delete their own records

### Application-Level Filtering

The application code adds an extra layer of security by:

1. Checking if user is authenticated before making queries
2. Explicitly filtering queries by user_id
3. Including user_id when creating new records

## Testing

After migration, test the following:

1. **Login as User A**: Create some incomes, payments, and credit boxes
2. **Logout and Login as User B**: Verify you don't see User A's data
3. **Create data as User B**: Verify it's separate from User A's data
4. **Real-time updates**: Verify updates only appear for the current user

## Troubleshooting

### Issue: "No data showing after migration"

**Solution**: Make sure you've assigned existing data to users (see step 2 above)

### Issue: "Error: user_id cannot be null"

**Solution**: Make sure all inserts include `user_id`. The code has been updated to automatically include this.

### Issue: "RLS policy violation"

**Solution**: Verify that:
1. RLS is enabled on all tables
2. Policies are correctly created
3. User is properly authenticated

### Issue: "Credit boxes not saving"

**Solution**: The unique constraint on credit_boxes has changed from `box_type` to `(user_id, box_type)`. Make sure the upsert uses the correct conflict target: `onConflict: 'user_id,box_type'`

## Security Notes

- RLS policies provide database-level security
- Application code provides an additional layer
- Users cannot access other users' data even if they try to modify queries
- All data is automatically filtered by Supabase based on the authenticated user

## Rollback (if needed)

If you need to rollback this migration:

```sql
-- Drop RLS policies
DROP POLICY IF EXISTS "Users can view their own incomes" ON incomes;
DROP POLICY IF EXISTS "Users can insert their own incomes" ON incomes;
DROP POLICY IF EXISTS "Users can update their own incomes" ON incomes;
DROP POLICY IF EXISTS "Users can delete their own incomes" ON incomes;

-- Repeat for payments and credit_boxes...

-- Drop user_id columns
ALTER TABLE incomes DROP COLUMN IF EXISTS user_id;
ALTER TABLE payments DROP COLUMN IF EXISTS user_id;
ALTER TABLE credit_boxes DROP COLUMN IF EXISTS user_id;

-- Recreate old policies (if needed)
CREATE POLICY "Allow all operations" ON incomes FOR ALL USING (true) WITH CHECK (true);
-- Repeat for other tables...
```

