-- Check what columns the existing policies are using
SELECT 
  schemaname,
  tablename,
  policyname,
  definition
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'pdrs'
ORDER BY policyname;

