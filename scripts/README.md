# Scripts Guide

This directory contains all utility scripts for the PDR Advanced system, organized by purpose.

## 📁 Directory Structure

### `/database` - SQL Scripts
Database migrations, fixes, optimizations, and maintenance scripts.

**Categories:**
- **Deployment**: Complete schema deployment scripts
- **Migrations**: Schema updates and migrations
- **Fixes**: Bug fixes and corrections
- **Optimizations**: Performance improvements
- **Verification**: Database state checks
- **Cleanup**: Data deletion and cleanup
- **Seed Data**: Initial data insertion

**Key Scripts:**
- `DEPLOY_TO_NEW_SUPABASE.sql` - Complete schema deployment
- `VERIFY_DATABASE_DEPLOYMENT.sql` - Verify deployment success
- `RUN_THIS_IN_SUPABASE_SQL_EDITOR.sql` - Quick setup script
- `view-current-pdrs.sql` - View all PDRs
- `delete-*.sql` - Various deletion strategies

**Usage:**
```bash
# Run in Supabase SQL Editor
1. Copy script contents
2. Paste into SQL Editor
3. Review and run
```

### `/testing` - Test & Verification Scripts
Automated testing scripts for API endpoints, user flows, and system verification.

**Key Scripts:**
- `test-api-endpoints.js` - Test all API endpoints
- `test-user-flows.js` - Test complete user workflows
- `test-approval-workflow.js` - Test approval process
- `verify-*.js` - Various verification scripts

**Usage:**
```bash
node scripts/testing/test-api-endpoints.js
node scripts/testing/test-user-flows.js
```

### `/utilities` - Utility Scripts
Data manipulation, migration, and maintenance utilities.

**Key Scripts:**
- `update-*.js` - Update existing data
- `create-*.js` - Create new data
- `cleanup-*.js` - Cleanup operations
- `wipe-*.js` - Database wiping utilities
- `delete-all-pdrs.js` - Complete PDR deletion
- `fix-auth-*.js` - Authentication fixes

**Usage:**
```bash
node scripts/utilities/[script-name].js
```

### `/debug` - Debugging Scripts
Diagnostic and debugging utilities for troubleshooting.

**Key Scripts:**
- `debug-*.js` - Debug specific systems
- `check-*.js` - Check system state
- `diagnose-*.js` - Diagnose issues

**Usage:**
```bash
node scripts/debug/check-database.js
node scripts/debug/diagnose-auth-issue.js
```

## 🚀 Common Tasks

### Initial Setup
```bash
# 1. Deploy database schema
#    Run in Supabase SQL Editor:
#    scripts/database/DEPLOY_TO_NEW_SUPABASE.sql

# 2. Verify deployment
#    Run in Supabase SQL Editor:
#    scripts/database/VERIFY_DATABASE_DEPLOYMENT.sql

# 3. Test API endpoints
node scripts/testing/test-api-endpoints.js

# 4. Test user flows
node scripts/testing/test-user-flows.js
```

### Testing & Verification
```bash
# Quick API health check
node scripts/testing/test-api-endpoints.js

# Full workflow testing
node scripts/testing/test-user-flows.js

# Verify database state
node scripts/debug/check-database.js

# Check authentication
node scripts/debug/diagnose-auth-issue.js
```

### Data Management
```bash
# View current PDRs (run in Supabase SQL Editor)
# scripts/database/view-current-pdrs.sql

# Delete test PDRs (run in Supabase SQL Editor)
# scripts/database/delete-test-pdrs-now.sql

# Clean database (run in Supabase SQL Editor)
# scripts/database/delete-all-pdrs-nuclear.sql
```

### Debugging
```bash
# Check database connection
node scripts/debug/check-database.js

# Check PDR status
node scripts/debug/check-pdr-locked-status.js

# Diagnose auth issues
node scripts/debug/diagnose-auth-issue.js
```

## 📝 Script Naming Conventions

### SQL Scripts
- `DEPLOY_*.sql` - Deployment scripts (uppercase)
- `VERIFY_*.sql` - Verification scripts (uppercase)
- `RUN_*.sql` - Quick run scripts (uppercase)
- `add-*.sql` - Add features/columns
- `fix-*.sql` - Fix issues
- `update-*.sql` - Update existing data
- `delete-*.sql` - Delete data
- `create-*.sql` - Create tables/data
- `cleanup-*.sql` - Cleanup operations
- `optimize-*.sql` - Optimization scripts
- `verify-*.sql` - Verification queries
- `view-*.sql` - View/query data
- `check-*.sql` - Check state
- `insert-*.sql` - Insert data
- `restore-*.sql` - Restore data

### JavaScript Scripts
- `test-*.js` - Testing scripts
- `verify-*.js` - Verification scripts
- `check-*.js` - State checking scripts
- `debug-*.js` - Debugging utilities
- `diagnose-*.js` - Diagnostic utilities
- `fix-*.js` - Fix scripts
- `update-*.js` - Update scripts
- `create-*.js` - Creation scripts
- `cleanup-*.js` - Cleanup utilities
- `wipe-*.js` - Data wiping utilities

## ⚠️ Important Notes

### Safety
1. **Always backup** before running destructive operations
2. **Test in development** before running in production
3. **Review SQL** before executing in Supabase
4. **Check environment** variables before running scripts

### SQL Scripts
- Run in **Supabase SQL Editor** (not terminal)
- Most use **transactions** for safety
- Review **preview output** before committing
- Check **comments** for specific instructions

### JavaScript Scripts
- Require **Node.js 18+**
- Need **environment variables** configured
- Some require **service_role key**
- Check script output for errors

### Common Issues

**"Module not found"**
- Run from project root: `node scripts/[category]/[script].js`
- Ensure `node_modules` is installed: `npm install`

**"Database connection failed"**
- Check `.env.local` file exists and has correct values
- Verify Supabase credentials are correct
- Ensure Supabase project is running

**"Permission denied"**
- Some operations require service_role key
- Check RLS policies are correct
- Verify you have necessary permissions

## 🔗 Related Documentation

- **Setup Guides**: `../docs/guides/`
- **Fix Archive**: `../docs/archive/`
- **Implementation Docs**: `../docs/implementation/`
- **Main README**: `../README.md`

## 📞 Quick Reference

| Task | Script |
|------|--------|
| Deploy schema | `database/DEPLOY_TO_NEW_SUPABASE.sql` |
| Test APIs | `testing/test-api-endpoints.js` |
| Test flows | `testing/test-user-flows.js` |
| Check DB | `debug/check-database.js` |
| View PDRs | `database/view-current-pdrs.sql` |
| Delete test data | `database/delete-test-pdrs-now.sql` |

---

**Last Updated**: October 2024
**Note**: Always check script comments for specific usage instructions.

