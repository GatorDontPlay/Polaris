-- =====================================================
-- BEHAVIOR ENTRIES SCHEMA UPDATE
-- =====================================================
-- This updates the behavior_entries table to match the expected Prisma schema

-- First, let's see what we have
-- Current: id, pdr_id, value_id, entry_date, description, impact, created_at, updated_at
-- Expected: id, pdr_id, value_id, author_id, author_type, description, examples, self_assessment, rating, comments, employee_entry_id, created_at, updated_at

-- Add missing columns to behavior_entries table
ALTER TABLE behavior_entries 
ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS author_type TEXT CHECK (author_type IN ('EMPLOYEE', 'CEO')),
ADD COLUMN IF NOT EXISTS examples TEXT,
ADD COLUMN IF NOT EXISTS self_assessment TEXT,
ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5),
ADD COLUMN IF NOT EXISTS comments TEXT,
ADD COLUMN IF NOT EXISTS employee_entry_id UUID REFERENCES behavior_entries(id);

-- Remove entry_date and impact columns if they exist (they don't match expected schema)
-- We'll keep them for now to avoid data loss, but they're not used in the Prisma code

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_behavior_entries_pdr_id ON behavior_entries(pdr_id);
CREATE INDEX IF NOT EXISTS idx_behavior_entries_author_id ON behavior_entries(author_id);
CREATE INDEX IF NOT EXISTS idx_behavior_entries_value_id ON behavior_entries(value_id);
CREATE INDEX IF NOT EXISTS idx_behavior_entries_employee_entry_id ON behavior_entries(employee_entry_id);

-- Add RLS policies for behavior_entries
DROP POLICY IF EXISTS "Users can view their own behavior entries" ON behavior_entries;
DROP POLICY IF EXISTS "CEO can view all behavior entries" ON behavior_entries;
DROP POLICY IF EXISTS "Users can insert their own behavior entries" ON behavior_entries;
DROP POLICY IF EXISTS "Users can update their own behavior entries" ON behavior_entries;
DROP POLICY IF EXISTS "CEO can update any behavior entries" ON behavior_entries;

-- Users can view behavior entries for their own PDRs or entries they authored
CREATE POLICY "Users can view their own behavior entries" ON behavior_entries FOR SELECT USING (
  EXISTS (SELECT 1 FROM pdrs WHERE pdrs.id = behavior_entries.pdr_id AND pdrs.user_id = auth.uid()) OR
  behavior_entries.author_id = auth.uid()
);

-- CEO can view all behavior entries
CREATE POLICY "CEO can view all behavior entries" ON behavior_entries FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
);

-- Users can insert behavior entries for their own PDRs
CREATE POLICY "Users can insert their own behavior entries" ON behavior_entries FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM pdrs WHERE pdrs.id = behavior_entries.pdr_id AND pdrs.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
);

-- Users can update their own behavior entries
CREATE POLICY "Users can update their own behavior entries" ON behavior_entries FOR UPDATE USING (
  behavior_entries.author_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
);

-- Users can delete their own behavior entries
CREATE POLICY "Users can delete their own behavior entries" ON behavior_entries FOR DELETE USING (
  behavior_entries.author_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
);

SELECT 'Behavior entries schema updated successfully!' as status;
