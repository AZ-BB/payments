-- Migration: Add user_id to all tables and update RLS policies
-- This ensures each user only sees and manages their own data

-- Add user_id column to incomes table
ALTER TABLE incomes 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to credit_boxes table
ALTER TABLE credit_boxes 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Make user_id NOT NULL after adding it (optional, but recommended)
-- Note: You may need to populate existing data first if you have any
-- ALTER TABLE incomes ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE payments ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE credit_boxes ALTER COLUMN user_id SET NOT NULL;

-- Drop old RLS policies
DROP POLICY IF EXISTS "Allow all operations" ON incomes;
DROP POLICY IF EXISTS "Allow all operations" ON payments;
DROP POLICY IF EXISTS "Allow all operations" ON credit_boxes;

-- Create new RLS policies for incomes
CREATE POLICY "Users can view their own incomes" ON incomes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own incomes" ON incomes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own incomes" ON incomes
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own incomes" ON incomes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create new RLS policies for payments
CREATE POLICY "Users can view their own payments" ON payments
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payments" ON payments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payments" ON payments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payments" ON payments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create new RLS policies for credit_boxes
-- Note: credit_boxes uses box_type as unique, so we need to make it unique per user
-- First, drop the unique constraint on box_type if it exists
ALTER TABLE credit_boxes DROP CONSTRAINT IF EXISTS credit_boxes_box_type_key;

-- Create a unique constraint on (user_id, box_type) combination
CREATE UNIQUE INDEX IF NOT EXISTS credit_boxes_user_box_unique 
ON credit_boxes(user_id, box_type);

CREATE POLICY "Users can view their own credit boxes" ON credit_boxes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credit boxes" ON credit_boxes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit boxes" ON credit_boxes
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit boxes" ON credit_boxes
  FOR DELETE
  USING (auth.uid() = user_id);

