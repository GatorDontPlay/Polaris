# PDR Advanced - Performance & Development Review System

A comprehensive, production-ready Performance & Development Review (PDR) system built with Next.js 14, TypeScript, and Supabase.

## 🚀 Features

- ✅ **Supabase Authentication**: Secure email-based auth with role-based access control
- ✅ **PostgreSQL Database**: Production-grade database with Row Level Security (RLS)
- ✅ **Role-Based Permissions**: Separate employee and CEO/admin workflows
- ✅ **Real-Time Data**: Synchronized state management with Supabase real-time capabilities
- ✅ **Complete Audit Trail**: Track all changes for compliance and accountability
- ✅ **Modern Tech Stack**: Next.js 14 App Router, TypeScript strict mode, Tailwind CSS

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
- **Supabase PostgreSQL** - Production database with Row Level Security (RLS)
- **Supabase Auth** - Built-in authentication and authorization
- **Type-Safe Database** - Auto-generated TypeScript types from database schema
- **Next.js API Routes** - RESTful API endpoints with server-side validation
- **Server Components** - Leveraging Next.js 14 App Router for optimal performance

### Development Tools
- **TypeScript** strict mode for type safety
- **ESLint** + **Prettier** for code quality
- **Tailwind CSS** with custom PDR color scheme
- **Git** with conventional commits

## 📊 Database Architecture

The system uses **Supabase PostgreSQL** with a comprehensive schema including:

- **Authentication Tables** - User profiles, roles, and sessions (managed by Supabase Auth)
- **PDR Core Tables** - Performance review instances, periods, and workflow state
- **Goals & Behaviors** - Employee objectives and value-based assessments
- **Review Tables** - Mid-year and end-year review data with ratings
- **Behavior Entries** - Detailed feedback and development tracking
- **Audit Logs** - Complete change history for compliance
- **Company Values** - Organizational values framework

**Security**: All tables protected by Row Level Security (RLS) policies ensuring users can only access their authorized data.

> See the complete schema in `scripts/database/DEPLOY_TO_NEW_SUPABASE.sql`

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier available at [supabase.com](https://supabase.com))
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/CodeFishStudio/Polaris.git
   cd Polaris
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Run the database schema: `scripts/database/DEPLOY_TO_NEW_SUPABASE.sql` in your Supabase SQL Editor
   - Note your project URL and anon key from Supabase settings

4. **Configure environment variables**
   ```bash
   cp env.example .env.local
   # Edit .env.local with your Supabase credentials:
   # - NEXT_PUBLIC_SUPABASE_URL
   # - NEXT_PUBLIC_SUPABASE_ANON_KEY
   # - SUPABASE_SERVICE_ROLE_KEY
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   ```
   http://localhost:3000
   ```

> 📚 For detailed setup instructions, see:
> - [Production Setup Guide](./docs/guides/PRODUCTION_SETUP_GUIDE.md) - Complete deployment guide
> - [Quick Setup Instructions](./docs/guides/QUICK-SETUP-INSTRUCTIONS.md) - Fast development setup

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
Polaris/
├── docs/                      # Complete documentation
│   ├── archive/              # Historical fixes and migrations
│   ├── guides/              # Setup and operational guides
│   └── implementation/      # Feature implementation docs
├── scripts/                   # Utility scripts
│   ├── database/            # SQL migrations and schema management (71 files)
│   ├── testing/             # Test and verification scripts
│   ├── utilities/           # Data maintenance and cleanup
│   └── debug/               # Debugging and diagnostic tools
├── src/
│   ├── app/                 # Next.js 14 App Router
│   │   ├── (auth)/         # Authentication pages
│   │   ├── (employee)/     # Employee dashboard and PDR pages
│   │   ├── (ceo)/          # CEO admin dashboard and reviews
│   │   └── api/            # API route handlers
│   ├── components/         # Reusable React components
│   │   ├── admin/         # Admin-specific components
│   │   ├── auth/          # Authentication components
│   │   ├── ceo/           # CEO review components
│   │   ├── dashboard/     # Dashboard components
│   │   ├── forms/         # Form components
│   │   ├── pdr/           # PDR-specific components
│   │   └── ui/            # shadcn/ui components
│   ├── lib/                # Core utilities and libraries
│   │   ├── supabase/      # Supabase client configurations
│   │   ├── auth.ts        # Authentication utilities
│   │   ├── permissions.ts # Permission checks
│   │   └── [other libs]   # Various utility modules
│   ├── types/              # TypeScript type definitions
│   ├── hooks/              # Custom React hooks
│   ├── providers/          # React context providers
│   └── stores/             # Zustand state stores
├── supabase/               # Supabase migrations
├── design_doc/             # Architecture and design docs
├── testing/                # Test plans and documentation
└── [config files]          # Next.js, TypeScript, Tailwind configs
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

- **Supabase Authentication** - Secure, production-grade auth with email verification
- **Row Level Security (RLS)** - Database-level access control for all tables
- **Role-Based Access Control** - EMPLOYEE and CEO roles with granular permissions
- **Input Validation** - Zod schemas for all user inputs
- **Type-Safe Database Operations** - TypeScript types generated from database schema
- **XSS Prevention** - Input sanitization and React's built-in protections
- **Comprehensive Audit Trail** - All changes tracked for compliance

## 🎨 UI/UX Design

- **Mobile-First** responsive design
- **WCAG Compliance** for accessibility
- **Australian Date Format** (DD/MM/YYYY)
- **Custom PDR Status Colors** and indicators
- **Stepper Interface** for guided workflow
- **Real-time Validation** and error handling

## 📈 Performance Optimizations

- **Next.js 14 App Router** - Automatic code splitting and route optimization
- **Server Components** - Reduced client-side JavaScript bundle
- **React Query Caching** - Smart data caching and synchronization
- **Database Indexing** - Optimized queries with proper indexes
- **Supabase Connection Pooling** - Efficient database connections
- **Image Optimization** - Next.js Image component with automatic optimization

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

- **Repository**: [GitHub - CodeFishStudio/Polaris](https://github.com/CodeFishStudio/Polaris)
- **Design Documentation**: [Solution Architecture](./design_doc/solution_architecture.md)
- **Setup Guide**: [Production Setup](./docs/guides/PRODUCTION_SETUP_GUIDE.md)
- **Database Scripts**: [SQL Scripts](./scripts/database/)
- **Test Scripts**: [Testing Scripts](./scripts/testing/)
- **Documentation Hub**: [docs/README.md](./docs/README.md)

---

**Polaris PDR System** - A production-ready performance review platform by CodeFish Studio
