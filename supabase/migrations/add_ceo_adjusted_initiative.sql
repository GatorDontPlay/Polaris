-- Add column for CEO adjusted initiatives (separate from CEO comments)
-- This fixes the bug where both "Adjust Employees Initiatives" and "CEO Notes/Feedback"
-- fields were saving to the same ceo_comments column, causing data loss

ALTER TABLE behaviors 
ADD COLUMN IF NOT EXISTS ceo_adjusted_initiative TEXT;

-- Add comment for documentation
COMMENT ON COLUMN behaviors.ceo_adjusted_initiative IS 
'CEO adjustments or refinements to employee behavior initiatives. This is separate from ceo_comments which contains CEO feedback/notes.';

-- Create index for better query performance when filtering by CEO feedback
CREATE INDEX IF NOT EXISTS idx_behaviors_ceo_adjusted_initiative 
ON behaviors(ceo_adjusted_initiative) 
WHERE ceo_adjusted_initiative IS NOT NULL;

