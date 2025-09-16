-- =====================================================
-- FIX PDRs RLS POLICIES - Fix 403 Forbidden errors
-- =====================================================

-- Enable RLS on PDRs table (in case it's not enabled)
ALTER TABLE pdrs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own PDRs" ON pdrs;
DROP POLICY IF EXISTS "CEO can view all PDRs" ON pdrs;
DROP POLICY IF EXISTS "Users can create their own PDRs" ON pdrs;
DROP POLICY IF EXISTS "Users can update their own PDRs" ON pdrs;
DROP POLICY IF EXISTS "CEO can update any PDR" ON pdrs;

-- Create RLS policies for PDRs
CREATE POLICY "Users can view their own PDRs" ON pdrs
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "CEO can view all PDRs" ON pdrs
FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
);

CREATE POLICY "Users can create their own PDRs" ON pdrs
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own PDRs" ON pdrs
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "CEO can update any PDR" ON pdrs
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
);

-- Also ensure other related tables have proper RLS policies

-- Goals RLS policies
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their PDR goals" ON goals;
DROP POLICY IF EXISTS "CEO can view all goals" ON goals;
DROP POLICY IF EXISTS "Users can manage their PDR goals" ON goals;
DROP POLICY IF EXISTS "CEO can manage all goals" ON goals;

CREATE POLICY "Users can view their PDR goals" ON goals
FOR SELECT USING (
  pdr_id IN (SELECT id FROM pdrs WHERE user_id = auth.uid())
);

CREATE POLICY "CEO can view all goals" ON goals
FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
);

CREATE POLICY "Users can manage their PDR goals" ON goals
FOR ALL USING (
  pdr_id IN (SELECT id FROM pdrs WHERE user_id = auth.uid())
);

CREATE POLICY "CEO can manage all goals" ON goals
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
);

-- Behaviors RLS policies
ALTER TABLE behaviors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their PDR behaviors" ON behaviors;
DROP POLICY IF EXISTS "CEO can view all behaviors" ON behaviors;
DROP POLICY IF EXISTS "Users can manage their PDR behaviors" ON behaviors;
DROP POLICY IF EXISTS "CEO can manage all behaviors" ON behaviors;

CREATE POLICY "Users can view their PDR behaviors" ON behaviors
FOR SELECT USING (
  pdr_id IN (SELECT id FROM pdrs WHERE user_id = auth.uid())
);

CREATE POLICY "CEO can view all behaviors" ON behaviors
FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
);

CREATE POLICY "Users can manage their PDR behaviors" ON behaviors
FOR ALL USING (
  pdr_id IN (SELECT id FROM pdrs WHERE user_id = auth.uid())
);

CREATE POLICY "CEO can manage all behaviors" ON behaviors
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
);

-- Grant proper permissions
GRANT ALL ON pdrs TO authenticated;
GRANT ALL ON goals TO authenticated;
GRANT ALL ON behaviors TO authenticated;

-- Success message
SELECT 'PDRs RLS policies fixed successfully! 403 errors should be resolved.' as status;
