-- =====================================================
-- SUPABASE BEHAVIOR ENTRIES MIGRATION
-- =====================================================
-- This migration updates the behavior_entries table to support the full PDR system
-- Run this in your Supabase SQL editor or via CLI

-- Step 1: Add missing columns to behavior_entries table
DO $$ 
BEGIN
    -- Add author_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'behavior_entries' AND column_name = 'author_id') THEN
        ALTER TABLE behavior_entries ADD COLUMN author_id UUID REFERENCES profiles(id);
    END IF;

    -- Add author_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'behavior_entries' AND column_name = 'author_type') THEN
        ALTER TABLE behavior_entries ADD COLUMN author_type TEXT CHECK (author_type IN ('EMPLOYEE', 'CEO'));
    END IF;

    -- Add examples column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'behavior_entries' AND column_name = 'examples') THEN
        ALTER TABLE behavior_entries ADD COLUMN examples TEXT;
    END IF;

    -- Add self_assessment column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'behavior_entries' AND column_name = 'self_assessment') THEN
        ALTER TABLE behavior_entries ADD COLUMN self_assessment TEXT;
    END IF;

    -- Add rating column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'behavior_entries' AND column_name = 'rating') THEN
        ALTER TABLE behavior_entries ADD COLUMN rating INTEGER CHECK (rating >= 1 AND rating <= 5);
    END IF;

    -- Add comments column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'behavior_entries' AND column_name = 'comments') THEN
        ALTER TABLE behavior_entries ADD COLUMN comments TEXT;
    END IF;

    -- Add employee_entry_id column (for linking CEO entries to employee entries)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'behavior_entries' AND column_name = 'employee_entry_id') THEN
        ALTER TABLE behavior_entries ADD COLUMN employee_entry_id UUID REFERENCES behavior_entries(id);
    END IF;

    RAISE NOTICE 'Behavior entries columns added successfully';
END $$;

-- Step 2: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_behavior_entries_pdr_id ON behavior_entries(pdr_id);
CREATE INDEX IF NOT EXISTS idx_behavior_entries_author_id ON behavior_entries(author_id);
CREATE INDEX IF NOT EXISTS idx_behavior_entries_value_id ON behavior_entries(value_id);
CREATE INDEX IF NOT EXISTS idx_behavior_entries_employee_entry_id ON behavior_entries(employee_entry_id);
CREATE INDEX IF NOT EXISTS idx_behavior_entries_author_type ON behavior_entries(author_type);

-- Step 3: Update RLS policies for behavior_entries
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own behavior entries" ON behavior_entries;
DROP POLICY IF EXISTS "CEO can view all behavior entries" ON behavior_entries;
DROP POLICY IF EXISTS "Users can insert their own behavior entries" ON behavior_entries;
DROP POLICY IF EXISTS "Users can update their own behavior entries" ON behavior_entries;
DROP POLICY IF EXISTS "CEO can update any behavior entries" ON behavior_entries;
DROP POLICY IF EXISTS "Users can delete their own behavior entries" ON behavior_entries;

-- Create comprehensive RLS policies
-- SELECT policies
CREATE POLICY "Users can view their own behavior entries" ON behavior_entries FOR SELECT USING (
  -- Users can view entries for their own PDRs
  EXISTS (SELECT 1 FROM pdrs WHERE pdrs.id = behavior_entries.pdr_id AND pdrs.user_id = auth.uid()) OR
  -- Users can view entries they authored
  behavior_entries.author_id = auth.uid()
);

CREATE POLICY "CEO can view all behavior entries" ON behavior_entries FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
);

-- INSERT policies
CREATE POLICY "Users can insert behavior entries for their own PDRs" ON behavior_entries FOR INSERT WITH CHECK (
  -- Employees can insert entries for their own PDRs
  (EXISTS (SELECT 1 FROM pdrs WHERE pdrs.id = behavior_entries.pdr_id AND pdrs.user_id = auth.uid()) AND
   behavior_entries.author_id = auth.uid()) OR
  -- CEOs can insert entries for any PDR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
);

-- UPDATE policies
CREATE POLICY "Users can update their own behavior entries" ON behavior_entries FOR UPDATE USING (
  -- Users can only update entries they authored
  behavior_entries.author_id = auth.uid() OR
  -- CEOs can update any entry
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
);

-- DELETE policies
CREATE POLICY "Users can delete their own behavior entries" ON behavior_entries FOR DELETE USING (
  -- Users can only delete entries they authored
  behavior_entries.author_id = auth.uid() OR
  -- CEOs can delete any entry
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
);

-- Step 4: Add helpful functions for behavior entries
-- First, let's check what columns actually exist
DO $$
DECLARE
    has_entry_date BOOLEAN;
    has_impact BOOLEAN;
BEGIN
    -- Check if entry_date column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'behavior_entries' AND column_name = 'entry_date'
    ) INTO has_entry_date;
    
    -- Check if impact column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'behavior_entries' AND column_name = 'impact'
    ) INTO has_impact;
    
    RAISE NOTICE 'entry_date exists: %, impact exists: %', has_entry_date, has_impact;
END $$;

-- Create a simplified function that only uses columns we know exist
CREATE OR REPLACE FUNCTION get_behavior_entries_with_relations(pdr_uuid UUID)
RETURNS TABLE (
  id UUID,
  pdr_id UUID,
  value_id UUID,
  author_id UUID,
  author_type TEXT,
  description TEXT,
  examples TEXT,
  self_assessment TEXT,
  rating INTEGER,
  comments TEXT,
  employee_entry_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  value_name TEXT,
  author_name TEXT,
  author_email TEXT
) 
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    be.id,
    be.pdr_id,
    be.value_id,
    be.author_id,
    be.author_type,
    be.description,
    be.examples,
    be.self_assessment,
    be.rating,
    be.comments,
    be.employee_entry_id,
    be.created_at,
    be.updated_at,
    cv.name as value_name,
    CONCAT(p.first_name, ' ', p.last_name) as author_name,
    p.email as author_email
  FROM behavior_entries be
  LEFT JOIN company_values cv ON be.value_id = cv.id
  LEFT JOIN profiles p ON be.author_id = p.id
  WHERE be.pdr_id = pdr_uuid
  ORDER BY be.created_at DESC;
$$;

-- Step 5: Verify the migration
DO $$
DECLARE
    column_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns 
    WHERE table_name = 'behavior_entries' 
    AND column_name IN ('author_id', 'author_type', 'examples', 'self_assessment', 'rating', 'comments', 'employee_entry_id');
    
    IF column_count = 7 THEN
        RAISE NOTICE '✅ Migration completed successfully! All 7 new columns added to behavior_entries table.';
    ELSE
        RAISE NOTICE '⚠️  Migration incomplete. Only % of 7 columns were added.', column_count;
    END IF;
END $$;

-- Final status
SELECT 
    'Behavior entries migration completed!' as status,
    'Ready for API integration' as next_step,
    NOW() as completed_at;
