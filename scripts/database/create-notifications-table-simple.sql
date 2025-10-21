-- =====================================================
-- CREATE NOTIFICATIONS TABLE (SIMPLE VERSION)
-- =====================================================

-- 1. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pdr_id UUID REFERENCES pdrs(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (cleanup)
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

-- Create RLS policies (simple approach)
CREATE POLICY "Users can view their notifications" ON notifications
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications" ON notifications
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON notifications
FOR INSERT WITH CHECK (true);

-- Grant permissions on notifications
GRANT ALL ON notifications TO authenticated;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read_at ON notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Success verification
SELECT 'Notifications table created successfully (simple version)!' as status;
