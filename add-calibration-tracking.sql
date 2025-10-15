-- =====================================================
-- Add Calibration Tracking to PDRs
-- =====================================================
-- This enables separating completed PDRs into:
-- - Calibration: COMPLETED but not yet calibrated
-- - Closed: COMPLETED and calibrated
-- =====================================================

-- Add calibrated_at column to pdrs table
ALTER TABLE pdrs 
ADD COLUMN IF NOT EXISTS calibrated_at TIMESTAMP WITH TIME ZONE;

-- Add calibrated_by column to track who closed the calibration
ALTER TABLE pdrs 
ADD COLUMN IF NOT EXISTS calibrated_by UUID REFERENCES profiles(id);

-- Add comment explaining the field
COMMENT ON COLUMN pdrs.calibrated_at IS 
'Timestamp when the PDR calibration was closed by CEO. NULL means still in calibration phase.';

COMMENT ON COLUMN pdrs.calibrated_by IS 
'User ID of the CEO who closed the calibration.';

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_pdrs_calibrated_at ON pdrs(calibrated_at) 
WHERE status = 'COMPLETED';

-- Verify the changes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'pdrs'
    AND column_name IN ('calibrated_at', 'calibrated_by')
ORDER BY column_name;

