-- =====================================================
-- FIX DELETE RLS POLICIES - Allow PDR deletion
-- =====================================================

-- Add DELETE policies for PDRs table
CREATE POLICY "Users can delete their own DRAFT PDRs" ON pdrs
FOR DELETE USING (
  user_id = auth.uid() AND status = 'DRAFT'
);

CREATE POLICY "Users can delete their own unlocked OPEN_FOR_REVIEW PDRs" ON pdrs
FOR DELETE USING (
  user_id = auth.uid() AND status = 'OPEN_FOR_REVIEW' AND is_locked = false
);

CREATE POLICY "CEO can delete any DRAFT PDR" ON pdrs
FOR DELETE USING (
  status = 'DRAFT' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
);

-- Add DELETE policies for goals table (needed for cascade deletion)
CREATE POLICY "Users can delete their PDR goals" ON goals
FOR DELETE USING (
  pdr_id IN (
    SELECT id FROM pdrs 
    WHERE user_id = auth.uid() 
    AND (status = 'DRAFT' OR (status = 'OPEN_FOR_REVIEW' AND is_locked = false))
  )
);

CREATE POLICY "CEO can delete all goals" ON goals
FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
);

-- Add DELETE policies for behaviors table (needed for cascade deletion)
CREATE POLICY "Users can delete their PDR behaviors" ON behaviors
FOR DELETE USING (
  pdr_id IN (
    SELECT id FROM pdrs 
    WHERE user_id = auth.uid() 
    AND (status = 'DRAFT' OR (status = 'OPEN_FOR_REVIEW' AND is_locked = false))
  )
);

CREATE POLICY "CEO can delete all behaviors" ON behaviors
FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
);

-- Add DELETE policies for behavior_entries table if it exists
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'behavior_entries') THEN
    ALTER TABLE behavior_entries ENABLE ROW LEVEL SECURITY;
    
    EXECUTE 'CREATE POLICY "Users can delete their PDR behavior entries" ON behavior_entries
    FOR DELETE USING (
      pdr_id IN (
        SELECT id FROM pdrs 
        WHERE user_id = auth.uid() 
        AND (status = ''DRAFT'' OR (status = ''OPEN_FOR_REVIEW'' AND is_locked = false))
      )
    )';
    
    EXECUTE 'CREATE POLICY "CEO can delete all behavior entries" ON behavior_entries
    FOR DELETE USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ''CEO'')
    )';
  END IF;
END $$;

-- Add DELETE policies for mid_year_reviews table if it exists
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mid_year_reviews') THEN
    ALTER TABLE mid_year_reviews ENABLE ROW LEVEL SECURITY;
    
    EXECUTE 'CREATE POLICY "Users can delete their PDR mid year reviews" ON mid_year_reviews
    FOR DELETE USING (
      pdr_id IN (
        SELECT id FROM pdrs 
        WHERE user_id = auth.uid() 
        AND (status = ''DRAFT'' OR (status = ''OPEN_FOR_REVIEW'' AND is_locked = false))
      )
    )';
    
    EXECUTE 'CREATE POLICY "CEO can delete all mid year reviews" ON mid_year_reviews
    FOR DELETE USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ''CEO'')
    )';
  END IF;
END $$;

-- Add DELETE policies for end_year_reviews table if it exists
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'end_year_reviews') THEN
    ALTER TABLE end_year_reviews ENABLE ROW LEVEL SECURITY;
    
    EXECUTE 'CREATE POLICY "Users can delete their PDR end year reviews" ON end_year_reviews
    FOR DELETE USING (
      pdr_id IN (
        SELECT id FROM pdrs 
        WHERE user_id = auth.uid() 
        AND (status = ''DRAFT'' OR (status = ''OPEN_FOR_REVIEW'' AND is_locked = false))
      )
    )';
    
    EXECUTE 'CREATE POLICY "CEO can delete all end year reviews" ON end_year_reviews
    FOR DELETE USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ''CEO'')
    )';
  END IF;
END $$;

-- Add DELETE policies for notifications table if it exists
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
    
    EXECUTE 'CREATE POLICY "Users can delete their PDR notifications" ON notifications
    FOR DELETE USING (
      pdr_id IN (
        SELECT id FROM pdrs 
        WHERE user_id = auth.uid() 
        AND (status = ''DRAFT'' OR (status = ''OPEN_FOR_REVIEW'' AND is_locked = false))
      )
    )';
    
    EXECUTE 'CREATE POLICY "CEO can delete all notifications" ON notifications
    FOR DELETE USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ''CEO'')
    )';
  END IF;
END $$;

-- Success message
SELECT 'DELETE RLS policies added successfully! PDR deletion should now work.' as status;
