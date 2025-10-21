# Documentation Guide

This directory contains all documentation for the PDR Advanced system, organized by type and purpose.

## 📁 Directory Structure

### `/archive` - Historical Fix Documentation
Organized by category, this contains all historical bug fixes, migrations, and troubleshooting documentation. Useful for understanding how issues were resolved and learning from past challenges.

- **`/auth-fixes`** - Authentication and Supabase migration fixes
- **`/behavior-fixes`** - Behavior system and development fields fixes  
- **`/ceo-fixes`** - CEO dashboard and admin interface fixes
- **`/pdr-status-fixes`** - PDR workflow and status management fixes
- **`/storage-fixes`** - LocalStorage quota and optimization fixes
- **`/rating-fixes`** - Employee rating system fixes
- **`/review-fixes`** - Mid-year and end-year review fixes
- **`/misc-fixes`** - Scrolling, API, validation, and other fixes

### `/guides` - Active Reference Guides
Current, actively maintained guides for setup, testing, and maintenance.

**Setup & Deployment:**
- `PRODUCTION_SETUP_GUIDE.md` - Complete production deployment
- `FINAL_SETUP_INSTRUCTIONS.md` - Step-by-step setup guide
- `QUICK-SETUP-INSTRUCTIONS.md` - Fast development setup
- `CLEAN-SLATE-INSTRUCTIONS.md` - Fresh database initialization

**Testing:**
- `COMPREHENSIVE_TESTING_GUIDE.md` - Full testing strategies
- `DEMO_TESTING_GUIDE.md` - Demo and feature testing
- `TESTING_RESULTS.md` - Test results documentation

**Maintenance:**
- `DELETE_PDRS_GUIDE.md` - Safe PDR deletion procedures
- `STATUS_DEBUG_GUIDE.md` - PDR status troubleshooting
- `RLS_OPTIMIZATION_MIGRATION_GUIDE.md` - Database optimization

**Quick Reference:**
- `QUICK_START_FIX.md` - Quick problem resolution
- `QUICK_FIX_STEPS.md` - Common fix procedures
- `QUICK_FIX_SUMMARY.md` - Fix summaries

### `/implementation` - Feature Implementation Docs
Documentation for implemented features and system architecture.

**Core Features:**
- `CALIBRATION_WORKFLOW_IMPLEMENTATION.md` - Calibration system
- `SALARY_BAND_MODELING_IMPLEMENTATION.md` - Compensation modeling
- `SALARY_REVIEW_IMPLEMENTATION_GUIDE.md` - Salary review process

**Compensation:**
- `BAND_CONFIGURATION_TOTAL_COMP_UPDATE.md` - Band configuration
- `COMPA_RATIO_VISUALIZATION_COMPLETE.md` - Compa ratio features
- `TOTAL_COMPENSATION_BAND_COMPLETE.md` - Total comp implementation
- `SIMPLIFIED_TARGET_BAND_COMPLETE.md` - Simplified band system

**System:**
- `IMPLEMENTATION_SUMMARY.md` - Overall system summary
- `RECENT_ACTIVITY_IMPLEMENTATION.md` - Activity tracking
- `DEMO_INFRASTRUCTURE_REMOVAL.md` - Demo system removal
- `SIMPLIFIED_SYSTEM.md` - System simplification
- `New_Product_Prompt_Template.md` - Development template

## 🔍 Finding Documentation

### By Topic

**Authentication & Setup:**
- Archive: `archive/auth-fixes/`
- Current: `guides/PRODUCTION_SETUP_GUIDE.md`

**Behaviors & Goals:**
- Archive: `archive/behavior-fixes/`
- Related scripts: `../scripts/database/*behavior*.sql`

**Reviews (Mid-Year & End-Year):**
- Archive: `archive/review-fixes/`
- Status issues: `guides/STATUS_DEBUG_GUIDE.md`

**CEO Dashboard:**
- Archive: `archive/ceo-fixes/`
- No current guide (functionality stable)

**Performance & Storage:**
- Archive: `archive/storage-fixes/`
- Related: Auto-save and quota fixes

**Ratings:**
- Archive: `archive/rating-fixes/`
- Implementation: Database-only storage

### By Need

**"I need to set up the system"**
→ Start with `guides/PRODUCTION_SETUP_GUIDE.md`

**"I need to test the system"**
→ Use `guides/COMPREHENSIVE_TESTING_GUIDE.md`

**"I need to delete test data"**
→ Follow `guides/DELETE_PDRS_GUIDE.md`

**"Something is broken"**
→ Check `archive/` for similar issues

**"I want to understand a feature"**
→ Browse `implementation/` docs

**"I need to run a script"**
→ See `../scripts/README.md`

## 📝 Documentation Standards

When adding new documentation:

1. **Fixes/Issues** → Save to `archive/[category]/`
2. **Active Guides** → Save to `guides/`
3. **Features** → Save to `implementation/`
4. Use clear, descriptive filenames
5. Include date/version when relevant
6. Cross-reference related docs

## 🔗 Related

- **Database Scripts**: `../scripts/database/`
- **Test Scripts**: `../scripts/testing/`
- **Main README**: `../README.md`
- **Architecture**: `../design_doc/solution_architecture.md`

---

**Last Updated**: October 2024

