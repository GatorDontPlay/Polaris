# Testing Guide: Behaviors Page Fix

## What Was Fixed
The blank Company Values & Behaviors Assessment page now displays all company value fields correctly. The issue was a data type mismatch between database (snake_case) and TypeScript types (camelCase).

## How to Test

### Step 1: Start the Development Server
```bash
npm run dev
```

### Step 2: Log In as an Employee
1. Navigate to `http://localhost:3000` (or your dev URL)
2. Log in with employee credentials
3. Go to your Dashboard

### Step 3: Navigate to Behaviors Page
1. Click on your current PDR (or create a new one)
2. Complete the "Goals" step if needed
3. Navigate to "Company Values & Behaviors Assessment" (Step 2)

### Step 4: Verify the Page Displays Correctly

You should now see:

#### ✅ 4 Company Value Cards:
1. **Craftsmanship**
   - With description popup (click the ? icon)
   - "How I plan to contribute" text field

2. **Lean Thinking**
   - With description popup
   - "How I plan to contribute" text field

3. **Value-Centric Innovation**
   - With description popup
   - "How I plan to contribute" text field

4. **Blameless Problem-Solving**
   - With description popup
   - "How I plan to contribute" text field

#### ✅ Professional Development Section:
5. **Self Reflection** field (500 char limit)
6. **Deep Dive Development** field (1000 char limit) with grant info

#### ✅ Navigation:
- "Back to Goals" button (top left)
- "Complete Assessment (0/6)" button (top right, disabled until all fields are filled)

### Step 5: Check Browser Console

Open browser DevTools (F12) and check the Console tab:

#### Expected Log Messages:
```
🔍 [API] Fetching company values from database...
🔍 [API] Number of values fetched: 4
🔍 [API] Transformed data: [Array of 4 items]

🔍 [HOOK] Fetching company values...
🔍 [HOOK] Company values result: { length: 4, ... }

🔍 [PAGE] Behaviors Page Debug: {
  companyValuesCount: 4,
  companyValuesIsArray: true
}

🔍 [FORM] StructuredBehaviorForm received props: {
  companyValuesCount: 4,
  companyValuesIsArray: true
}
```

#### ❌ What NOT to See:
- No error messages
- No "No Company Values Found" warnings
- No blank/empty page

### Step 6: Test Form Functionality

1. **Type in a field** - verify auto-save indicator appears
2. **Fill all 6 fields** - verify "Complete Assessment" button becomes enabled
3. **Navigate away and back** - verify data persists
4. **Click "Complete Assessment"** - verify navigation to Review page

## Troubleshooting

### If Page is Still Blank

1. **Check the console for specific errors**
   - Look for any red error messages
   - Check what the logs say about data fetching

2. **Verify database has data**:
   Open Supabase SQL Editor and run:
   ```sql
   SELECT name, id, is_active, sort_order
   FROM company_values
   WHERE is_active = true
   ORDER BY sort_order;
   ```
   Should return 4 rows.

3. **Test API directly**:
   In browser console, run:
   ```javascript
   fetch('/api/company-values')
     .then(r => r.json())
     .then(data => console.log('API Response:', data))
   ```
   Should return: `{ success: true, data: [4 items] }`

4. **Check authentication**:
   - Log out and log back in
   - Clear cookies and retry

### If You See Error States

The page now has helpful error messages:

- **"Error Loading Company Values"** = API call failed
  - Check Supabase connection
  - Verify environment variables

- **"No Company Values Found"** = API returned empty array
  - Check database has active company values
  - Verify RLS policies allow reading

## Success Criteria

✅ Page displays all 4 company value cards  
✅ Each card has a text field  
✅ Professional Development section shows 2 fields  
✅ Auto-save indicator appears when typing  
✅ Complete button enables when all 6 fields are filled  
✅ Browser console shows successful data fetching  
✅ No errors in console  

## Next Steps After Testing

If everything works:
1. Test with multiple employees
2. Verify data saves to database
3. Test the full PDR workflow (Goals → Behaviors → Review)
4. Remove debug logging before production (optional)

If issues persist:
1. Share the browser console logs
2. Share the API test results
3. Check the `FIX_BLANK_BEHAVIORS_PAGE.md` document for more details


