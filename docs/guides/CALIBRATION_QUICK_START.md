# Calibration Workflow - Quick Start Guide

## 🎯 What Changed?

The CEO dashboard now has a proper distinction between:
- **Calibration Tab** - Completed PDRs that need calibration/modeling
- **Closed Tab** - Completed PDRs that have been calibrated and closed

## 🚀 Quick Setup (3 Steps)

### Step 1: Run Database Migration

In your Supabase SQL Editor, run:
```bash
/Users/ryan/Documents/Repos/pdr_advanced/add-calibration-tracking.sql
```

This adds:
- `calibrated_at` timestamp column
- `calibrated_by` user reference column
- Performance index

### Step 2: Restart Your Dev Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

### Step 3: Test the Workflow

1. **Login as CEO**
2. **Go to Dashboard** → Click "Calibration" tab
3. **You'll see completed PDRs** awaiting calibration
4. **Click "Close Calibration"** on any PDR
5. **Verify it moves to "Closed" tab**

## ✅ What You Get

### Calibration Tab
- Shows only PDRs that need calibration
- Green "Close Calibration" button for each PDR
- Clear indication of work remaining

### Closed Tab
- Shows only PDRs already calibrated
- "View" button for read-only access
- Historical record of closed PDRs

## 📊 Visual Workflow

```
Employee Completes PDR
        ↓
Status: COMPLETED (calibrated_at = NULL)
        ↓
Appears in CEO "Calibration" Tab
        ↓
CEO Reviews & Models Salary
        ↓
CEO Clicks "Close Calibration"
        ↓
Sets calibrated_at = NOW()
        ↓
Moves to CEO "Closed" Tab
```

## 🔍 Verify It's Working

### Check Database
```sql
SELECT 
  id,
  status,
  calibrated_at,
  CASE 
    WHEN calibrated_at IS NULL THEN 'In Calibration Tab'
    ELSE 'In Closed Tab'
  END as current_location
FROM pdrs
WHERE status = 'COMPLETED'
ORDER BY updated_at DESC
LIMIT 10;
```

### Check Frontend
1. Count in "Calibration" badge should decrease when you close
2. Count in "Closed" badge should increase
3. PDR should disappear from Calibration list immediately

## 🎨 UI Changes

### Before
- Both tabs showed the same completed PDRs
- No way to mark as "done with calibration"
- Confusion about which PDRs need attention

### After
- Calibration tab = work to do
- Closed tab = already done
- Green button to move PDR from calibration → closed

## 🛠️ Troubleshooting

### "PDR not appearing in Calibration"
**Cause:** PDR not fully completed
**Fix:** Check PDR status is exactly 'COMPLETED'

### "Close button not showing"
**Cause:** Not viewing Calibration tab
**Fix:** Click the "Calibration" tab first

### "Button click does nothing"
**Cause:** API error or auth issue
**Fix:** Check browser console for errors

## 📝 Files Modified

```
✅ add-calibration-tracking.sql        (NEW - migration)
✅ src/types/supabase.ts               (types updated)
✅ src/app/api/admin/dashboard/route.ts (counts added)
✅ src/app/api/pdrs/[id]/close-calibration/route.ts (NEW - endpoint)
✅ src/app/(ceo)/admin/page.tsx        (filters + button)
```

## 🎉 That's It!

You now have a working calibration workflow that clearly separates:
- What needs CEO review (Calibration)
- What's already done (Closed)

For detailed technical documentation, see: `CALIBRATION_WORKFLOW_IMPLEMENTATION.md`

