-- Migration: Add weighting column to goals table
-- Run this in your Supabase SQL editor

-- Add weighting column to goals table
ALTER TABLE goals 
ADD COLUMN weighting INTEGER DEFAULT 0 CHECK (weighting >= 0 AND weighting <= 100);

-- Add comment to document the field
COMMENT ON COLUMN goals.weighting IS 'Goal weighting as percentage (0-100)';

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'goals' 
ORDER BY ordinal_position;
