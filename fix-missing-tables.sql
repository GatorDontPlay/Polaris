-- =====================================================
-- ADD MISSING TABLES THAT CAUSE 500 ERRORS
-- =====================================================

-- 1. Create notifications table (missing from our reset)
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

-- RLS policies for notifications
CREATE POLICY IF NOT EXISTS "Users can view their notifications" ON notifications
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can update their notifications" ON notifications
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "System can create notifications" ON notifications
FOR INSERT WITH CHECK (true);

-- Grant permissions on notifications
GRANT ALL ON notifications TO authenticated;

-- 2. Add any missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read_at ON notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Success message
SELECT 'Missing tables added successfully!' as status;
