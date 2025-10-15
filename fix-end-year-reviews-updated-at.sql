-- =====================================================
-- FIX: Add updated_at column to end_year_reviews table
-- =====================================================
-- This fixes the error: "Could not find the 'updated_at' column of 'end_year_reviews'"

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'end_year_reviews' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE end_year_reviews 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        -- Set existing rows to have updated_at = created_at
        UPDATE end_year_reviews 
        SET updated_at = created_at 
        WHERE updated_at IS NULL;
        
        RAISE NOTICE 'Added updated_at column to end_year_reviews table';
    ELSE
        RAISE NOTICE 'updated_at column already exists in end_year_reviews table';
    END IF;
END $$;

-- Create or replace the trigger function for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS update_end_year_reviews_updated_at ON end_year_reviews;

CREATE TRIGGER update_end_year_reviews_updated_at
    BEFORE UPDATE ON end_year_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Similarly, add updated_at to mid_year_reviews if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'mid_year_reviews' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE mid_year_reviews 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        UPDATE mid_year_reviews 
        SET updated_at = created_at 
        WHERE updated_at IS NULL;
        
        RAISE NOTICE 'Added updated_at column to mid_year_reviews table';
    ELSE
        RAISE NOTICE 'updated_at column already exists in mid_year_reviews table';
    END IF;
END $$;

-- Add trigger for mid_year_reviews
DROP TRIGGER IF EXISTS update_mid_year_reviews_updated_at ON mid_year_reviews;

CREATE TRIGGER update_mid_year_reviews_updated_at
    BEFORE UPDATE ON mid_year_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verify the changes
SELECT 
    table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name IN ('end_year_reviews', 'mid_year_reviews')
    AND column_name = 'updated_at'
ORDER BY table_name;

