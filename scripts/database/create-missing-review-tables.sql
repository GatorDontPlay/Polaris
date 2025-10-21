-- =====================================================
-- CREATE MISSING REVIEW TABLES FOR PDR ENDPOINTS
-- =====================================================

-- Create mid_year_reviews table
CREATE TABLE IF NOT EXISTS mid_year_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pdr_id UUID REFERENCES pdrs(id) ON DELETE CASCADE NOT NULL,
  employee_self_reflection TEXT,
  employee_achievements TEXT,
  employee_challenges TEXT,
  employee_development_goals TEXT,
  ceo_feedback TEXT,
  ceo_achievements_feedback TEXT,
  ceo_development_feedback TEXT,
  meeting_date DATE,
  meeting_notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create end_year_reviews table
CREATE TABLE IF NOT EXISTS end_year_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pdr_id UUID REFERENCES pdrs(id) ON DELETE CASCADE NOT NULL,
  employee_self_assessment TEXT,
  employee_year_achievements TEXT,
  employee_year_challenges TEXT,
  employee_next_year_goals TEXT,
  ceo_overall_feedback TEXT,
  ceo_performance_rating INTEGER CHECK (ceo_performance_rating >= 1 AND ceo_performance_rating <= 5),
  ceo_achievements_summary TEXT,
  ceo_development_areas TEXT,
  ceo_next_year_expectations TEXT,
  salary_review_recommendation TEXT,
  meeting_date DATE,
  meeting_notes TEXT,
  final_rating INTEGER CHECK (final_rating >= 1 AND final_rating <= 5),
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on both tables
ALTER TABLE mid_year_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_year_reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their mid year reviews" ON mid_year_reviews;
DROP POLICY IF EXISTS "Users can update their mid year reviews" ON mid_year_reviews;
DROP POLICY IF EXISTS "CEOs can view all mid year reviews" ON mid_year_reviews;
DROP POLICY IF EXISTS "CEOs can update all mid year reviews" ON mid_year_reviews;

DROP POLICY IF EXISTS "Users can view their end year reviews" ON end_year_reviews;
DROP POLICY IF EXISTS "Users can update their end year reviews" ON end_year_reviews;
DROP POLICY IF EXISTS "CEOs can view all end year reviews" ON end_year_reviews;
DROP POLICY IF EXISTS "CEOs can update all end year reviews" ON end_year_reviews;

-- RLS policies for mid_year_reviews
CREATE POLICY "Users can view their mid year reviews" ON mid_year_reviews
FOR SELECT USING (
  pdr_id IN (SELECT id FROM pdrs WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update their mid year reviews" ON mid_year_reviews
FOR ALL USING (
  pdr_id IN (SELECT id FROM pdrs WHERE user_id = auth.uid())
);

CREATE POLICY "CEOs can view all mid year reviews" ON mid_year_reviews
FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
);

CREATE POLICY "CEOs can update all mid year reviews" ON mid_year_reviews
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
);

-- RLS policies for end_year_reviews
CREATE POLICY "Users can view their end year reviews" ON end_year_reviews
FOR SELECT USING (
  pdr_id IN (SELECT id FROM pdrs WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update their end year reviews" ON end_year_reviews
FOR ALL USING (
  pdr_id IN (SELECT id FROM pdrs WHERE user_id = auth.uid())
);

CREATE POLICY "CEOs can view all end year reviews" ON end_year_reviews
FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
);

CREATE POLICY "CEOs can update all end year reviews" ON end_year_reviews
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
);

-- Grant permissions
GRANT ALL ON mid_year_reviews TO authenticated;
GRANT ALL ON end_year_reviews TO authenticated;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_mid_year_reviews_pdr_id ON mid_year_reviews(pdr_id);
CREATE INDEX IF NOT EXISTS idx_mid_year_reviews_created_at ON mid_year_reviews(created_at);
CREATE INDEX IF NOT EXISTS idx_end_year_reviews_pdr_id ON end_year_reviews(pdr_id);
CREATE INDEX IF NOT EXISTS idx_end_year_reviews_created_at ON end_year_reviews(created_at);

-- Success message
SELECT 'Missing review tables created successfully!' as status;
