# Fix End-Year Status Issue - Instructions

## Problem Summary
The end-year review was created in the database, but the PDR status wasn't updated from `MID_YEAR_APPROVED` to `END_YEAR_SUBMITTED`. This causes:
- ❌ Status badge shows "Mid-Year Approved" instead of "End-Year Submitted"
- ❌ CEO cannot see the PDR in their dashboard for final review
- ✅ Employee sees "Submitted" in the end-year section (because review exists)

## Root Cause
This happened because the employee submitted the end-year review BEFORE we applied the service role client fix. The RLS policies blocked the status update but didn't rollback the review creation.

## How to Fix

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New query"

### Step 2: Run the Migration Script
1. Open the file: `fix-orphaned-end-year-reviews.sql`
2. Copy the entire contents
3. Paste into the Supabase SQL Editor
4. Click "Run" or press `Cmd/Ctrl + Enter`

### Step 3: Review the Output
The script will show you:
- **Step 1**: Lists all PDRs with orphaned end-year reviews
- **Step 2**: Updates the PDR status to `END_YEAR_SUBMITTED`
- **Step 3**: Verifies the fix was successful
- **Step 4**: Confirms database consistency

### Step 4: Refresh the Application
After running the script:
1. Refresh the employee's PDR page
2. Refresh the CEO's dashboard

## Expected Results After Fix

### Employee View:
- ✅ Status badge changes from "Mid-Year Approved" to "End-Year Submitted"
- ✅ "Locked" badge remains (correct behavior)
- ✅ End-Year section still shows "Submitted"
- ✅ Page displays "under review by manager" message

### CEO View:
- ✅ PDR appears in dashboard with "END_YEAR_SUBMITTED" status
- ✅ CEO can click to open and review
- ✅ CEO can provide final feedback and complete the review

## Prevention
The code fix we already applied (`supabaseAdmin` service role client in `/api/pdrs/[id]/end-year/route.ts`) prevents this issue from happening again for future submissions.

## Questions?
If the script reports any issues or if the problem persists after running it, check:
1. The script output for error messages
2. That you're running it in the correct Supabase project
3. That the user has submitted an end-year review (check the `end_year_reviews` table)


