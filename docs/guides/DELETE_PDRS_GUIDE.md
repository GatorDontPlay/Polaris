# 🗑️ PDR Deletion Guide

Quick reference for safely deleting test/demo PDRs from your Supabase database.

---

## 🚀 Quick Start (Recommended 3-Step Process)

### **Step 1: View What You Have**
```bash
# Open Supabase SQL Editor and run:
scripts/database/view-current-pdrs.sql
```
This shows you all PDRs, users, and test data currently in your database.

### **Step 2: Choose Your Deletion Strategy**

| If you want to... | Use this file | Risk Level |
|-------------------|---------------|------------|
| Delete only test/demo user PDRs | `scripts/database/delete-test-pdrs-now.sql` | ✅ Safe |
| Delete ALL PDRs (clean slate) | `scripts/database/delete-all-pdrs-nuclear.sql` | ⚠️ Destructive |
| Delete specific PDRs by status/user | `scripts/database/delete-pdrs-selective.sql` | ✅ Safe |
| Delete with backup first | `scripts/database/delete-pdrs-safe.sql` | ✅ Safest |

### **Step 3: Execute in Supabase**
1. Open your Supabase project
2. Go to **SQL Editor**
3. Copy/paste the chosen SQL file
4. Review the preview output
5. If it looks correct, the transaction will commit

---

## 📋 Detailed Options

### Option 1: Delete Test/Demo PDRs Only (RECOMMENDED)
**File:** `scripts/database/delete-test-pdrs-now.sql`

**What it does:**
- Deletes PDRs for users with "test", "demo", or "@example.com" in their email
- Preserves all production user data
- Shows before/after counts
- Safe and reversible (within transaction)

**When to use:**
- You have both test and production data
- You want to keep production PDRs intact
- You're cleaning up after testing

**Example users it will affect:**
- test@example.com
- demo-user@company.com
- john.doe.test@company.com

---

### Option 2: Delete ALL PDRs (Nuclear Option)
**File:** `scripts/database/delete-all-pdrs-nuclear.sql`

**What it does:**
- Deletes ALL PDRs for ALL users
- Preserves user accounts and company values
- Complete clean slate
- Shows which users will be affected

**When to use:**
- Fresh start for entire system
- Development/staging environment
- No production data to preserve

**⚠️ WARNING:** This cannot be undone! All PDR data will be lost.

---

### Option 3: Selective Deletion
**File:** `scripts/database/delete-pdrs-selective.sql`

**What it does:**
- Multiple options in one file (uncomment the one you want)
- Delete by status (e.g., only "Created" PDRs)
- Delete by specific user email
- Delete by specific PDR ID
- Delete only end-year review data

**When to use:**
- Need fine-grained control
- Want to target specific PDRs
- Testing specific workflows

---

### Option 4: Safe Deletion with Backup
**File:** `scripts/database/delete-pdrs-safe.sql`

**What it does:**
- Creates timestamped backup tables first
- Multiple deletion options
- Can restore if something goes wrong
- Most comprehensive approach

**When to use:**
- Production environment
- Want ability to rollback
- Being extra cautious

---

## 🎯 Most Common Scenarios

### Scenario A: "I just want to delete my test data"
```sql
-- Use: scripts/database/delete-test-pdrs-now.sql
-- This is probably what you want! ✅
```

### Scenario B: "I want a completely clean database"
```sql
-- Use: scripts/database/delete-all-pdrs-nuclear.sql
-- Nuclear option - deletes everything ⚠️
```

### Scenario C: "I want to delete a specific user's PDRs"
```sql
-- Use: scripts/database/delete-pdrs-selective.sql (Option 3)
-- Replace 'USER_EMAIL_HERE' with actual email
```

### Scenario D: "I'm in production and scared"
```sql
-- Use: scripts/database/delete-pdrs-safe.sql
-- Creates backups first, very safe ✅
```

---

## 🔍 Check Before Deleting

Always run this query first to see what you have:

```sql
-- Quick check
SELECT 
  prof.email,
  COUNT(p.id) as pdr_count
FROM pdrs p
JOIN profiles prof ON prof.id = p.user_id
GROUP BY prof.email
ORDER BY pdr_count DESC;
```

---

## ✅ What Gets Preserved

All deletion scripts preserve:
- ✓ User accounts (profiles table)
- ✓ Company values
- ✓ Band configurations
- ✓ System settings

Only PDR data is deleted:
- ✗ PDRs
- ✗ Goals
- ✗ Behaviors
- ✗ Mid-year reviews
- ✗ End-year reviews
- ✗ Behavior entries

---

## 🆘 Emergency Restore

If you used `scripts/database/delete-pdrs-safe.sql` and need to restore:

```sql
-- Find your backup tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%backup_%';

-- Then run the restore section in scripts/database/delete-pdrs-safe.sql
-- with your backup suffix
```

---

## 📞 Quick Reference Commands

### View current state:
```bash
scripts/database/view-current-pdrs.sql
```

### Delete test data:
```bash
scripts/database/delete-test-pdrs-now.sql
```

### Delete everything:
```bash
scripts/database/delete-all-pdrs-nuclear.sql
```

### Get help:
- Check this guide
- Review SQL comments in each file
- Run preview queries before committing

---

## 🎓 Pro Tips

1. **Always preview first** - All scripts show what will be deleted before committing
2. **Use transactions** - All scripts use BEGIN/COMMIT for safety
3. **Check twice, delete once** - Review the preview output carefully
4. **Test users convention** - Use "test" or "demo" in email addresses for easy cleanup
5. **Backup in production** - Always use `delete-pdrs-safe.sql` in production

---

## 🚨 Troubleshooting

**"Foreign key constraint error"**
- Scripts delete in correct order, but check for custom relationships

**"Permission denied"**
- Ensure you're logged in as service_role or have proper RLS permissions

**"Transaction failed"**
- Check the error message
- Verify table names match your schema
- Ensure no concurrent modifications

**"How do I undo this?"**
- If transaction hasn't committed: `ROLLBACK;`
- If already committed: Use backup restore (if created with `delete-pdrs-safe.sql`)
- Otherwise: Data is permanently deleted

---

## 📝 Created Files Summary

| File | Purpose | Risk |
|------|---------|------|
| `scripts/database/view-current-pdrs.sql` | Preview database state | 🟢 Read-only |
| `scripts/database/delete-test-pdrs-now.sql` | Delete test/demo users | 🟡 Moderate |
| `scripts/database/delete-all-pdrs-nuclear.sql` | Delete all PDRs | 🔴 High |
| `scripts/database/delete-pdrs-selective.sql` | Selective deletion | 🟡 Moderate |
| `scripts/database/delete-pdrs-safe.sql` | Delete with backup | 🟢 Low |

---

**Made by:** Claude Sonnet (Your friendly neighborhood PDR janitor 🧹)
**Last updated:** {{ date }}


