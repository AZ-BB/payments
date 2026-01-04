-- Fix incomes table structure and refresh schema cache
-- Run this in your Supabase SQL Editor

-- First, check if columns exist and add them if missing
DO $$ 
BEGIN
    -- Add payment_method column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'incomes' 
        AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE incomes ADD COLUMN payment_method TEXT;
    END IF;

    -- Add payment_proof column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'incomes' 
        AND column_name = 'payment_proof'
    ) THEN
        ALTER TABLE incomes ADD COLUMN payment_proof TEXT;
    END IF;
END $$;

-- Verify the table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'incomes'
ORDER BY ordinal_position;

-- Force refresh PostgREST schema cache
-- Try multiple methods to ensure cache refresh
NOTIFY pgrst, 'reload schema';

-- Alternative: Grant usage on schema (this can trigger a refresh)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Wait a moment and try again
SELECT pg_sleep(2);

-- Final verification query
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    CASE WHEN column_name IN ('payment_method', 'payment_proof') THEN '✓ Found' ELSE '' END as status
FROM information_schema.columns
WHERE table_name = 'incomes'
ORDER BY ordinal_position;

