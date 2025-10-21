# PDR Advanced - Performance & Development Review System

A comprehensive Performance & Development Review (PDR) system built with Next.js 14, TypeScript, Supabase, and Prisma.

## 🚀 **Now with Supabase Integration!**

**Latest Update**: This application has been fully migrated to **Supabase authentication and database**. Features real user sign-up, authentication, role-based access control, and production-ready data management.

- ✅ **Real Authentication**: Supabase Auth with email confirmation
- ✅ **Production Database**: PostgreSQL with Row Level Security (RLS)
- ✅ **Role-Based Access**: Employee and CEO roles with proper permissions
- ✅ **Real-Time Data**: Live updates and synchronized state management

> See `docs/archive/auth-fixes/SUPABASE_MIGRATION_COMPLETE.md` for detailed migration information.

## 🎯 Project Overview

The PDR Advanced system streamlines employee performance reviews and development planning with two primary user roles:

- **Employees**: Manage their own performance goals, behavior assessments, and self-evaluations
- **CEOs/Administrators**: Complete oversight, review, and rating capabilities with comprehensive reporting

## ✨ Key Features

### Employee Features
- **Goal Setting**: Define "What" they aim to achieve with success criteria
- **Behavior Assessment**: Demonstrate "How" they align with company values
- **Self-Evaluation**: Mid-year and end-year review submissions
- **Progress Tracking**: Monitor PDR status and historical performance

### CEO/Admin Features
- **Review Management**: Review, rate, and provide feedback on all employee PDRs
- **Lock/Unlock Control**: Manage PDR editing permissions
- **Dashboard Overview**: System-wide statistics and pending actions
- **Audit Trail**: Complete change tracking and compliance reporting

### System Features
- **Status-Driven Workflow**: 7-stage PDR process from Draft to Completed
- **Audit Logging**: Comprehensive tracking of all system changes
- **Role-Based Security**: Granular permissions and data access control
- **Australian Localization**: DD/MM/YYYY date format throughout

## 🛠 Tech Stack

### Frontend
- **Next.js 14** with App Router and TypeScript (strict mode)
- **Tailwind CSS** for styling with custom PDR theme
- **shadcn/ui** components for consistent UI
- **React Hook Form** + **Zod** for form validation
- **Zustand** + **React Query** for state management

### Backend
- **Supabase** - PostgreSQL database with Row Level Security (RLS)
- **Supabase Auth** - Authentication and authorization
- **Type-Safe Database** operations with generated TypeScript types
- **RESTful API** with Next.js API routes

### Development Tools
- **TypeScript** strict mode for type safety
- **ESLint** + **Prettier** for code quality
- **Tailwind CSS** with custom PDR color scheme
- **Git** with conventional commits

## 📊 Database Schema

The system includes 8 core tables:

- **users** - Employee and CEO user accounts
- **pdr_periods** - Annual review cycles
- **pdrs** - Individual performance review instances
- **goals** - Employee objectives ("What")
- **company_values** - Organizational values framework
- **behaviors** - Value-based assessments ("How")
- **mid_year_reviews** - Mid-year check-in data
- **end_year_reviews** - Final assessment data
- **audit_logs** - Complete change tracking

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pdr_advanced
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   # Edit . with your database and configuration details
   ```

4. **Set up the database**
   - Follow the [Production Setup Guide](./docs/guides/PRODUCTION_SETUP_GUIDE.md) for complete Supabase setup
   - Or use [Quick Setup Instructions](./docs/guides/QUICK-SETUP-INSTRUCTIONS.md) for rapid deployment

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   ```
   http://localhost:3000
   ```

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format with Prettier
npm run type-check   # TypeScript type checking

# Testing
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run e2e          # Run end-to-end tests

# Utility Scripts
node scripts/testing/test-api-endpoints.js    # Test API endpoints
node scripts/testing/test-user-flows.js       # Test user workflows
node scripts/debug/check-database.js          # Check database connection
```

## 📁 Project Structure

```
pdr_advanced/
├── docs/                      # All documentation
│   ├── archive/              # Historical fix documentation
│   │   ├── auth-fixes/      # Authentication-related fixes
│   │   ├── behavior-fixes/  # Behavior system fixes
│   │   ├── ceo-fixes/       # CEO dashboard fixes
│   │   ├── pdr-status-fixes/# PDR workflow fixes
│   │   ├── storage-fixes/   # LocalStorage & quota fixes
│   │   ├── rating-fixes/    # Rating system fixes
│   │   ├── review-fixes/    # Review process fixes
│   │   └── misc-fixes/      # Other fixes
│   ├── guides/              # Active reference guides
│   └── implementation/      # Feature implementation docs
├── scripts/                   # Utility scripts
│   ├── database/            # SQL migrations and fixes
│   ├── testing/             # Test and verification scripts
│   ├── utilities/           # Maintenance scripts
│   └── debug/               # Debugging scripts
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (auth)/         # Authentication routes
│   │   ├── (employee)/     # Employee routes
│   │   ├── (ceo)/          # CEO admin routes
│   │   └── api/            # API endpoints
│   ├── components/         # Reusable UI components
│   ├── lib/                # Utility libraries
│   ├── types/              # TypeScript type definitions
│   ├── hooks/              # Custom React hooks
│   └── utils/              # Helper functions
├── supabase/               # Supabase migrations
├── design_doc/             # Architecture documentation
├── testing/                # Test plans and documentation
├── .cursor/                # Cursor IDE rules and configuration
└── [config files]          # Various configuration files
```

## 🔄 PDR Workflow

The system follows a 7-stage workflow:

1. **DRAFT** - Employee creates and edits goals/behaviors
2. **SUBMITTED** - Initial submission for review
3. **UNDER_REVIEW** - CEO reviews and provides feedback
4. **MID_YEAR_CHECK** - Mid-year progress assessment
5. **END_YEAR_REVIEW** - Final self-assessment and CEO evaluation
6. **COMPLETED** - Review cycle finished
7. **LOCKED** - No further edits allowed (archived)

## 🔐 Security Features

- **JWT Authentication** with HTTP-only cookies
- **Role-Based Access Control** (EMPLOYEE/CEO permissions)
- **Input Validation** with Zod schemas
- **SQL Injection Protection** via Prisma ORM
- **XSS Prevention** with input sanitization
- **Audit Trail** for compliance and change tracking

## 🎨 UI/UX Design

- **Mobile-First** responsive design
- **WCAG Compliance** for accessibility
- **Australian Date Format** (DD/MM/YYYY)
- **Custom PDR Status Colors** and indicators
- **Stepper Interface** for guided workflow
- **Real-time Validation** and error handling

## 📈 Performance Optimizations

- **Code Splitting** with Next.js automatic optimization
- **Database Indexing** for query performance
- **React Query Caching** for efficient data fetching
- **Image Optimization** with Next.js Image component
- **Bundle Analysis** for size monitoring

## 🧪 Testing Strategy

- **Unit Tests** for utility functions
- **Integration Tests** for API endpoints
- **End-to-End Tests** with Playwright
- **Type Safety** with TypeScript strict mode
- **Code Quality** with ESLint and Prettier

## 📚 Documentation

### Core Documentation
- **[Solution Architecture](./design_doc/solution_architecture.md)** - Complete technical specification
- **[Cursor Rules](./.cursor/rules/)** - Development guidelines and patterns

### Setup & Deployment
- **[Production Setup Guide](./docs/guides/PRODUCTION_SETUP_GUIDE.md)** - Complete deployment guide
- **[Quick Setup Instructions](./docs/guides/QUICK-SETUP-INSTRUCTIONS.md)** - Fast setup for development
- **[Clean Slate Instructions](./docs/guides/CLEAN-SLATE-INSTRUCTIONS.md)** - Fresh database setup

### Testing & Maintenance
- **[Comprehensive Testing Guide](./docs/guides/COMPREHENSIVE_TESTING_GUIDE.md)** - Testing strategies
- **[PDR Deletion Guide](./docs/guides/DELETE_PDRS_GUIDE.md)** - Safe data cleanup procedures
- **[Status Debug Guide](./docs/guides/STATUS_DEBUG_GUIDE.md)** - Troubleshooting PDR status issues

### Implementation References
- **[Calibration Workflow](./docs/implementation/CALIBRATION_WORKFLOW_IMPLEMENTATION.md)** - Calibration feature details
- **[Salary Band Modeling](./docs/implementation/SALARY_BAND_MODELING_IMPLEMENTATION.md)** - Compensation modeling
- **[Implementation Summary](./docs/implementation/IMPLEMENTATION_SUMMARY.md)** - Feature overview

### Historical Context
All historical fixes and migration documentation are organized in `./docs/archive/` by category for reference.

## 🤝 Contributing

1. Follow the established coding patterns and architecture
2. Ensure TypeScript strict mode compliance
3. Run tests and linting before committing
4. Use conventional commit messages
5. Update documentation for new features

## 📄 License

This project is proprietary. All rights reserved.

## 🔗 Quick Links

- **Design Documentation**: [Solution Architecture](./design_doc/solution_architecture.md)
- **Development Rules**: [Cursor Rules](./.cursor/rules/)
- **Setup Guide**: [Production Setup](./docs/guides/PRODUCTION_SETUP_GUIDE.md)
- **Database Scripts**: [SQL Scripts](./scripts/database/)
- **Test Scripts**: [Testing Scripts](./scripts/testing/)

---

**Built with ❤️ using the VIBE Coding methodology - Architecture First, Performance by Design**
