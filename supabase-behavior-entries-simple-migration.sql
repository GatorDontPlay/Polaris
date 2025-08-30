-- =====================================================
-- SIMPLE BEHAVIOR ENTRIES MIGRATION
-- =====================================================
-- This is a safer, simpler migration that just adds the required columns

-- Step 1: Check current table structure
SELECT 'Current behavior_entries columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'behavior_entries' 
ORDER BY ordinal_position;

-- Step 2: Add missing columns one by one with error handling
DO $$ 
BEGIN
    -- Add author_id column
    BEGIN
        ALTER TABLE behavior_entries ADD COLUMN author_id UUID REFERENCES profiles(id);
        RAISE NOTICE '✅ Added author_id column';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE '⚠️  author_id column already exists';
    END;

    -- Add author_type column
    BEGIN
        ALTER TABLE behavior_entries ADD COLUMN author_type TEXT CHECK (author_type IN ('EMPLOYEE', 'CEO'));
        RAISE NOTICE '✅ Added author_type column';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE '⚠️  author_type column already exists';
    END;

    -- Add examples column
    BEGIN
        ALTER TABLE behavior_entries ADD COLUMN examples TEXT;
        RAISE NOTICE '✅ Added examples column';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE '⚠️  examples column already exists';
    END;

    -- Add self_assessment column
    BEGIN
        ALTER TABLE behavior_entries ADD COLUMN self_assessment TEXT;
        RAISE NOTICE '✅ Added self_assessment column';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE '⚠️  self_assessment column already exists';
    END;

    -- Add rating column
    BEGIN
        ALTER TABLE behavior_entries ADD COLUMN rating INTEGER CHECK (rating >= 1 AND rating <= 5);
        RAISE NOTICE '✅ Added rating column';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE '⚠️  rating column already exists';
    END;

    -- Add comments column
    BEGIN
        ALTER TABLE behavior_entries ADD COLUMN comments TEXT;
        RAISE NOTICE '✅ Added comments column';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE '⚠️  comments column already exists';
    END;

    -- Add employee_entry_id column
    BEGIN
        ALTER TABLE behavior_entries ADD COLUMN employee_entry_id UUID REFERENCES behavior_entries(id);
        RAISE NOTICE '✅ Added employee_entry_id column';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE '⚠️  employee_entry_id column already exists';
    END;

END $$;

-- Step 3: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_behavior_entries_pdr_id ON behavior_entries(pdr_id);
CREATE INDEX IF NOT EXISTS idx_behavior_entries_author_id ON behavior_entries(author_id);
CREATE INDEX IF NOT EXISTS idx_behavior_entries_value_id ON behavior_entries(value_id);
CREATE INDEX IF NOT EXISTS idx_behavior_entries_employee_entry_id ON behavior_entries(employee_entry_id);
CREATE INDEX IF NOT EXISTS idx_behavior_entries_author_type ON behavior_entries(author_type);

-- Step 4: Update RLS policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own behavior entries" ON behavior_entries;
DROP POLICY IF EXISTS "CEO can view all behavior entries" ON behavior_entries;
DROP POLICY IF EXISTS "Users can insert their own behavior entries" ON behavior_entries;
DROP POLICY IF EXISTS "Users can update their own behavior entries" ON behavior_entries;
DROP POLICY IF EXISTS "Users can delete their own behavior entries" ON behavior_entries;

-- Create new RLS policies
CREATE POLICY "Users can view their own behavior entries" ON behavior_entries FOR SELECT USING (
  EXISTS (SELECT 1 FROM pdrs WHERE pdrs.id = behavior_entries.pdr_id AND pdrs.user_id = auth.uid()) OR
  behavior_entries.author_id = auth.uid()
);

CREATE POLICY "CEO can view all behavior entries" ON behavior_entries FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
);

CREATE POLICY "Users can insert behavior entries for their own PDRs" ON behavior_entries FOR INSERT WITH CHECK (
  (EXISTS (SELECT 1 FROM pdrs WHERE pdrs.id = behavior_entries.pdr_id AND pdrs.user_id = auth.uid()) AND
   behavior_entries.author_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
);

CREATE POLICY "Users can update their own behavior entries" ON behavior_entries FOR UPDATE USING (
  behavior_entries.author_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
);

CREATE POLICY "Users can delete their own behavior entries" ON behavior_entries FOR DELETE USING (
  behavior_entries.author_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
);

-- Step 5: Final verification
SELECT 'Migration completed! New behavior_entries structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'behavior_entries' 
ORDER BY ordinal_position;

-- Count new columns
SELECT 
    COUNT(*) as total_columns,
    COUNT(CASE WHEN column_name IN ('author_id', 'author_type', 'examples', 'self_assessment', 'rating', 'comments', 'employee_entry_id') THEN 1 END) as new_columns
FROM information_schema.columns 
WHERE table_name = 'behavior_entries';

SELECT '🎉 Behavior entries migration completed successfully!' as status;
