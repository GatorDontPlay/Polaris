-- =====================================================
-- CREATE NOTIFICATIONS TABLE TO FIX 500 ERRORS
-- =====================================================

-- 1. Create notifications table (this is what's missing)
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

-- RLS policies for notifications (using DO blocks for conditional creation)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notifications' 
        AND policyname = 'Users can view their notifications'
    ) THEN
        CREATE POLICY "Users can view their notifications" ON notifications
        FOR SELECT USING (user_id = auth.uid());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notifications' 
        AND policyname = 'Users can update their notifications'
    ) THEN
        CREATE POLICY "Users can update their notifications" ON notifications
        FOR UPDATE USING (user_id = auth.uid());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notifications' 
        AND policyname = 'System can create notifications'
    ) THEN
        CREATE POLICY "System can create notifications" ON notifications
        FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Grant permissions on notifications
GRANT ALL ON notifications TO authenticated;

-- 2. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read_at ON notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- 3. Success verification
SELECT 'Notifications table created successfully!' as status;
