-- =====================================================
-- URGENT FIX: Add missing columns to goals table
-- Copy and paste this entire script into your Supabase SQL Editor
-- =====================================================

-- Add weighting column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='goals' AND column_name='weighting') THEN
        ALTER TABLE goals ADD COLUMN weighting INTEGER DEFAULT 0 
        CHECK (weighting >= 0 AND weighting <= 100);
        COMMENT ON COLUMN goals.weighting IS 'Goal weighting as percentage (0-100)';
        RAISE NOTICE 'Added weighting column to goals table';
    ELSE
        RAISE NOTICE 'weighting column already exists in goals table';
    END IF;
END $$;

-- Create goal_mapping enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'goal_mapping_type') THEN
        CREATE TYPE goal_mapping_type AS ENUM (
            'PEOPLE_CULTURE', 
            'VALUE_DRIVEN_INNOVATION', 
            'OPERATING_EFFICIENCY', 
            'CUSTOMER_EXPERIENCE'
        );
        RAISE NOTICE 'Created goal_mapping_type enum';
    ELSE
        RAISE NOTICE 'goal_mapping_type enum already exists';
    END IF;
END $$;

-- Add goal_mapping column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='goals' AND column_name='goal_mapping') THEN
        ALTER TABLE goals ADD COLUMN goal_mapping goal_mapping_type;
        COMMENT ON COLUMN goals.goal_mapping IS 'Maps goal to strategic pillar';
        RAISE NOTICE 'Added goal_mapping column to goals table';
    ELSE
        RAISE NOTICE 'goal_mapping column already exists in goals table';
    END IF;
END $$;

-- Update any NULL weighting values to 0
UPDATE goals SET weighting = 0 WHERE weighting IS NULL;

-- Show current goals table structure for verification
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'goals' 
ORDER BY ordinal_position;
