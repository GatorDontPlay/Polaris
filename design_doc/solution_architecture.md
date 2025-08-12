# PDR System - Solution Architecture Design Document

**Version:** 1.0  
**Date:** 2024  
**Project:** Performance & Development Review (PDR) System  
**Stack:** Next.js 14 + TypeScript + PostgreSQL + Prisma  

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Technology Stack](#technology-stack)
4. [Database Design](#database-design)
5. [API Architecture](#api-architecture)
6. [Component Architecture](#component-architecture)
7. [Authentication & Authorization](#authentication--authorization)
8. [Security Considerations](#security-considerations)
9. [Performance Strategy](#performance-strategy)
10. [Implementation Roadmap](#implementation-roadmap)
11. [Deployment Architecture](#deployment-architecture)
12. [Appendices](#appendices)

---

## Executive Summary

The PDR (Performance & Development Review) System is a comprehensive web application designed to streamline employee performance reviews and development planning. The system supports two primary user roles: Employees who manage their own performance goals and assessments, and CEOs/Administrators who can review, rate, and manage all employee PDRs.

### Key Features
- **Employee Self-Service**: Goal setting, behavior assessment, and self-evaluation
- **CEO Administration**: Complete oversight, review, and rating capabilities
- **Audit Trail**: Comprehensive logging of all system changes
- **Role-Based Security**: Granular permissions based on user roles
- **Responsive Design**: Mobile-first approach with accessibility compliance

### Success Criteria
- ✅ **Type-Safe**: Full TypeScript coverage with strict mode
- ✅ **Scalable**: Clean architecture supporting future growth
- ✅ **Performant**: Optimized for both development and runtime performance
- ✅ **Secure**: Robust authentication and data validation
- ✅ **Accessible**: WCAG compliance and keyboard navigation
- ✅ **Maintainable**: Clear code organization and documentation

---

## System Overview

### Core Entities
1. **Users** - Employees and CEOs with role-based access
2. **PDR Periods** - Annual review cycles
3. **PDRs** - Individual performance review instances
4. **Goals** - "What" employees aim to achieve
5. **Behaviors** - "How" employees demonstrate company values
6. **Reviews** - Mid-year and end-of-year assessments

### User Journeys

#### Employee Journey
```
Dashboard → Create/Access PDR → Set Goals → Define Behaviors → 
Submit for Review → Mid-Year Check-in → End-Year Assessment → Completion
```

#### CEO Journey
```
Admin Dashboard → View All Employees → Review Individual PDRs → 
Provide Ratings/Comments → Lock/Unlock PDRs → Generate Reports
```

### System States
- **DRAFT** - Employee is working on their PDR
- **SUBMITTED** - PDR submitted for initial review
- **UNDER_REVIEW** - CEO reviewing and providing feedback
- **MID_YEAR_CHECK** - Mid-year check-in phase
- **END_YEAR_REVIEW** - Final assessment phase
- **COMPLETED** - Review cycle finished
- **LOCKED** - No further edits allowed

---

## Technology Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode)
- **UI Library**: shadcn/ui components
- **Styling**: Tailwind CSS
- **State Management**: Zustand + React Query
- **Forms**: React Hook Form + Zod validation
- **Date Handling**: Australian format (DD/MM/YYYY)

### Backend
- **Database**: PostgreSQL 15+
- **ORM**: Prisma
- **Authentication**: JWT with HTTP-only cookies
- **API**: RESTful endpoints with Next.js API routes
- **Validation**: Zod schemas

### Development Tools
- **Code Quality**: ESLint + Prettier
- **Version Control**: Git with conventional commits
- **Package Manager**: npm/yarn
- **Environment**: Node.js 18+

### Deployment
- **Platform**: Vercel (recommended) or self-hosted
- **Database**: PostgreSQL (managed service)
- **Monitoring**: Application and database monitoring
- **Backup**: Automated database backups

---

## Database Design

### Schema Overview

```sql
-- Core user management
users (id, email, first_name, last_name, role, password_hash, is_active, created_at, updated_at)

-- Review periods/cycles
pdr_periods (id, name, start_date, end_date, is_active, created_at)

-- Individual PDR instances
pdrs (id, user_id, period_id, status, is_locked, current_step, submitted_at, created_at, updated_at)

-- Employee goals ("What")
goals (id, pdr_id, title, description, target_outcome, success_criteria, priority, 
       employee_progress, employee_rating, ceo_comments, ceo_rating, created_at, updated_at)

-- Company values for behavior assessment
company_values (id, name, description, is_active, sort_order, created_at)

-- Employee behaviors ("How")
behaviors (id, pdr_id, value_id, description, examples, employee_self_assessment, 
          employee_rating, ceo_comments, ceo_rating, created_at, updated_at)

-- Mid-year reviews
mid_year_reviews (id, pdr_id, progress_summary, blockers_challenges, support_needed, 
                  employee_comments, ceo_feedback, submitted_at, created_at)

-- End-year reviews
end_year_reviews (id, pdr_id, achievements_summary, learnings_growth, challenges_faced, 
                  next_year_goals, employee_overall_rating, ceo_overall_rating, 
                  ceo_final_comments, submitted_at, created_at)

-- Audit trail
audit_logs (id, table_name, record_id, action, old_values, new_values, changed_by, 
           changed_at, ip_address, user_agent)
```

### Key Relationships
- Users → PDRs (1:many)
- PDR Periods → PDRs (1:many)
- PDRs → Goals (1:many)
- PDRs → Behaviors (1:many)
- Company Values → Behaviors (1:many)
- PDRs → Mid Year Reviews (1:1)
- PDRs → End Year Reviews (1:1)

### Indexes Strategy
```sql
-- Performance optimization indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_pdrs_user_period ON pdrs(user_id, period_id);
CREATE INDEX idx_pdrs_status ON pdrs(status);
CREATE INDEX idx_goals_pdr ON goals(pdr_id);
CREATE INDEX idx_behaviors_pdr ON behaviors(pdr_id);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_changed_at ON audit_logs(changed_at);
```

### Data Constraints
- Unique constraint on (user_id, period_id) in PDRs table
- Rating fields constrained to 1-5 scale
- Enum constraints on status and priority fields
- Foreign key constraints with CASCADE delete where appropriate

---

## API Architecture

### RESTful Endpoints

#### Authentication
```
POST   /api/auth/login          # User login
POST   /api/auth/logout         # User logout
POST   /api/auth/refresh        # Token refresh
GET    /api/auth/me             # Current user info
```

#### PDR Management
```
GET    /api/pdrs                # List PDRs (filtered by role)
GET    /api/pdrs/:id            # Get specific PDR with details
POST   /api/pdrs                # Create new PDR
PUT    /api/pdrs/:id            # Update PDR
PUT    /api/pdrs/:id/lock       # Lock/unlock PDR (CEO only)
PUT    /api/pdrs/:id/submit     # Submit PDR step
PUT    /api/pdrs/:id/status     # Update PDR status
```

#### Goals Management
```
GET    /api/pdrs/:pdrId/goals   # Get all goals for PDR
POST   /api/pdrs/:pdrId/goals   # Create new goal
PUT    /api/goals/:id           # Update goal
DELETE /api/goals/:id           # Delete goal
```

#### Behaviors Management
```
GET    /api/pdrs/:pdrId/behaviors    # Get behaviors for PDR
POST   /api/pdrs/:pdrId/behaviors    # Create behavior entry
PUT    /api/behaviors/:id            # Update behavior
DELETE /api/behaviors/:id            # Delete behavior
```

#### Company Values
```
GET    /api/company-values           # Get all active company values
POST   /api/company-values          # Create value (CEO only)
PUT    /api/company-values/:id      # Update value (CEO only)
```

#### Reviews
```
POST   /api/pdrs/:pdrId/mid-year    # Submit mid-year review
PUT    /api/pdrs/:pdrId/mid-year    # Update mid-year review
POST   /api/pdrs/:pdrId/end-year    # Submit end-year review
PUT    /api/pdrs/:pdrId/end-year    # Update end-year review
```

#### CEO/Admin Functions
```
GET    /api/admin/employees         # Get all employees with PDR status
GET    /api/admin/pdrs              # Get all PDRs with filters
PUT    /api/admin/pdrs/:id/review   # CEO review and rating
GET    /api/admin/audit-logs        # Get audit trail
GET    /api/admin/reports           # Various reports
```

### Request/Response Format

#### Standard Response Format
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  timestamp: string;
}
```

#### Error Response Format
```typescript
interface ErrorResponse {
  success: false;
  error: string;
  code: 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'INTERNAL_ERROR';
  details?: Record<string, string[]>; // For validation errors
  timestamp: string;
}
```

### Validation Strategy
- All inputs validated using Zod schemas
- Type-safe validation with automatic TypeScript inference
- Consistent error messages and field-level validation
- Sanitization of user inputs to prevent XSS

---

## Component Architecture

### File Structure
```
app/
├── (auth)/
│   └── login/
│       └── page.tsx
├── (employee)/
│   ├── dashboard/
│   │   └── page.tsx
│   ├── pdr/
│   │   └── [id]/
│   │       ├── page.tsx
│   │       ├── goals/
│   │       ├── behaviors/
│   │       ├── review/
│   │       ├── mid-year/
│   │       └── end-year/
│   └── history/
│       └── page.tsx
├── (ceo)/
│   └── admin/
│       ├── page.tsx
│       ├── employees/
│       ├── employee/
│       │   └── [id]/
│       ├── pdr/
│       │   └── [id]/
│       ├── reports/
│       └── audit/
├── api/
│   ├── auth/
│   ├── pdrs/
│   ├── goals/
│   ├── behaviors/
│   ├── company-values/
│   └── admin/
├── globals.css
├── layout.tsx
└── middleware.ts

components/
├── layout/
│   ├── AppLayout.tsx
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   └── Footer.tsx
├── ui/
│   ├── StepperIndicator.tsx
│   ├── PDRStatusBadge.tsx
│   ├── RatingInput.tsx
│   ├── ProgressBar.tsx
│   ├── DataTable.tsx
│   ├── LoadingSpinner.tsx
│   ├── ErrorBoundary.tsx
│   └── [shadcn-ui components]
├── pdr/
│   ├── GoalForm.tsx
│   ├── BehaviorForm.tsx
│   ├── ReviewForm.tsx
│   ├── PDRCard.tsx
│   └── StepperNavigation.tsx
├── admin/
│   ├── EmployeeList.tsx
│   ├── PDRReviewPanel.tsx
│   ├── AdminDashboard.tsx
│   └── AuditLogViewer.tsx
└── forms/
    ├── LoginForm.tsx
    ├── GoalFormFields.tsx
    └── BehaviorFormFields.tsx

lib/
├── auth.ts
├── db.ts
├── validations.ts
├── utils.ts
└── constants.ts

types/
├── index.ts
├── auth.ts
├── pdr.ts
└── api.ts
```

### Component Design Patterns

#### Page Components
```typescript
// Server Components for data fetching
export default async function EmployeeDashboard() {
  const user = await getCurrentUser();
  const pdrs = await getUserPDRs(user.id);
  
  return (
    <AppLayout>
      <DashboardHeader user={user} />
      <PDROverview pdrs={pdrs} />
      <PDRHistory userId={user.id} />
    </AppLayout>
  );
}
```

#### Client Components
```typescript
'use client'
export function GoalForm({ pdrId, goal }: GoalFormProps) {
  const form = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: goal
  });
  
  const { mutate, isPending } = useMutation({
    mutationFn: goal ? updateGoal : createGoal,
    onSuccess: () => router.refresh()
  });
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Form fields */}
      </form>
    </Form>
  );
}
```

### State Management Strategy

#### Authentication State (Zustand)
```typescript
interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}
```

#### Server State (React Query)
```typescript
// Custom hooks for data fetching
const usePDRs = (userId?: string) => {
  return useQuery({
    queryKey: ['pdrs', userId],
    queryFn: () => fetchPDRs(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

const usePDRMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updatePDR,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdrs'] });
    },
  });
};
```

#### Form State (React Hook Form + Zod)
```typescript
const goalSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  targetOutcome: z.string().optional(),
  successCriteria: z.string().optional(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
});

type GoalFormData = z.infer<typeof goalSchema>;
```

---

## Authentication & Authorization

### JWT Strategy
- **Access Tokens**: 24-hour expiry, stored in HTTP-only cookies
- **Refresh Tokens**: 7-day expiry, secure storage
- **Token Payload**: User ID, role, issued/expiry timestamps
- **Security**: Signed with strong secret, HTTPS required in production

### Role-Based Access Control

#### Employee Permissions
```typescript
const EMPLOYEE_PERMISSIONS = [
  'read:own-pdr',
  'write:own-pdr-draft',
  'submit:own-pdr',
  'read:own-history',
  'write:own-goals',
  'write:own-behaviors',
  'submit:mid-year-review',
  'submit:end-year-review'
] as const;
```

#### CEO Permissions
```typescript
const CEO_PERMISSIONS = [
  ...EMPLOYEE_PERMISSIONS,
  'read:all-pdrs',
  'write:all-pdrs',
  'lock:pdrs',
  'unlock:pdrs',
  'read:audit-logs',
  'read:reports',
  'manage:company-values',
  'admin:users'
] as const;
```

### Middleware Protection
```typescript
// Next.js middleware for route protection
export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token');
  const { pathname } = request.nextUrl;
  
  // Public routes
  if (pathname.startsWith('/login')) {
    return NextResponse.next();
  }
  
  // Protected routes
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Role-based route protection
  const user = verifyToken(token.value);
  if (pathname.startsWith('/admin') && user.role !== 'CEO') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  return NextResponse.next();
}
```

### Password Security
- **Hashing**: bcrypt with salt rounds ≥ 12
- **Requirements**: Minimum 8 characters, complexity rules
- **Reset**: Secure token-based password reset flow
- **Session Management**: Automatic logout on inactivity

---

## Security Considerations

### Data Protection
- **Encryption**: All sensitive data encrypted at rest
- **Transmission**: HTTPS/TLS 1.3 for all communications
- **Database**: Connection encryption, access controls
- **Backups**: Encrypted backup storage with retention policies

### Input Validation
- **Client-Side**: Real-time validation with Zod schemas
- **Server-Side**: Comprehensive validation on all endpoints
- **Sanitization**: HTML sanitization to prevent XSS
- **SQL Injection**: Prevented through Prisma ORM parameterized queries

### Access Controls
- **API Endpoints**: Role-based authorization middleware
- **Database**: Row-level security policies
- **File Access**: Secure file upload/download handling
- **Admin Functions**: Additional verification for sensitive operations

### Audit Trail
- **Change Tracking**: All CRUD operations logged
- **User Actions**: Login attempts, permission changes
- **Data Retention**: Configurable retention periods
- **Compliance**: Support for regulatory requirements

### Security Headers
```typescript
// Next.js security headers
const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline';"
};
```

---

## Performance Strategy

### Frontend Optimization
- **Code Splitting**: Automatic route-based splitting
- **Lazy Loading**: Component and data lazy loading
- **Bundle Analysis**: Regular bundle size monitoring
- **Image Optimization**: Next.js Image component
- **Caching**: Strategic use of React Query caching

### Backend Optimization
- **Database Indexes**: Optimized for common query patterns
- **Query Optimization**: Efficient Prisma queries with minimal N+1
- **Connection Pooling**: Database connection management
- **Rate Limiting**: API endpoint protection
- **Compression**: Response compression for large payloads

### Caching Strategy
```typescript
// React Query cache configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,     // 5 minutes
      cacheTime: 10 * 60 * 1000,    // 10 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

// Next.js revalidation
export const revalidate = 300; // 5 minutes for ISR
```

### Monitoring & Analytics
- **Performance Metrics**: Core Web Vitals tracking
- **Error Tracking**: Comprehensive error logging
- **Database Monitoring**: Query performance and slow query detection
- **User Analytics**: Usage patterns and feature adoption

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
**Objective**: Establish core infrastructure and authentication

#### Week 1: Project Setup
- [ ] Initialize Next.js 14 project with TypeScript
- [ ] Configure Tailwind CSS and shadcn/ui
- [ ] Set up ESLint, Prettier, and development tools
- [ ] Create project structure and basic layouts
- [ ] Configure environment variables and scripts

#### Week 2: Database & Auth
- [ ] Set up PostgreSQL database
- [ ] Create Prisma schema and initial migrations
- [ ] Implement JWT authentication service
- [ ] Create login/logout functionality
- [ ] Set up role-based middleware and route protection

**Deliverables**:
- Working authentication system
- Database schema with migrations
- Protected routes and role-based access
- Development environment fully configured

### Phase 2: Core Infrastructure (Weeks 2-3)
**Objective**: Build API foundation and shared components

#### API Development
- [ ] Implement Next.js API routes with error handling
- [ ] Create CRUD operations for all entities
- [ ] Add request validation with Zod schemas
- [ ] Implement audit logging system
- [ ] Set up comprehensive error handling

#### UI Foundation
- [ ] Create base layout components (Header, Sidebar, Footer)
- [ ] Implement navigation and routing structure
- [ ] Set up error boundaries and loading states
- [ ] Create reusable form components
- [ ] Implement responsive design patterns

**Deliverables**:
- Complete API layer with all endpoints
- Reusable UI component library
- Error handling and validation system
- Responsive layout framework

### Phase 3: Employee Features (Weeks 3-4)
**Objective**: Build complete employee experience

#### Employee Dashboard
- [ ] PDR status overview and quick stats
- [ ] Current PDR access and progress indicators
- [ ] Historical PDR table with filtering
- [ ] Navigation to different PDR sections

#### PDR Stepper Flow
- [ ] Step 1: Goals creation and management
  - [ ] Add/edit/delete goals functionality
  - [ ] Priority setting and validation
  - [ ] Success criteria definition
- [ ] Step 2: Behaviors assessment
  - [ ] Company values integration
  - [ ] Behavior examples and descriptions
  - [ ] Self-assessment capabilities
- [ ] Step 3: Review and submission
  - [ ] Summary of goals and behaviors
  - [ ] Validation and submission workflow
  - [ ] Progress indicator and step navigation

#### Review Phases
- [ ] Mid-year check-in form
  - [ ] Progress reporting
  - [ ] Blockers and challenges
  - [ ] Support requests
- [ ] End-of-year self-assessment
  - [ ] Achievement summaries
  - [ ] Learning and growth reflection
  - [ ] Self-rating capabilities

**Deliverables**:
- Complete employee dashboard
- Functional PDR stepper with all steps
- Mid-year and end-year review capabilities
- Data persistence and validation

### Phase 4: CEO/Admin Features (Weeks 4-5)
**Objective**: Build comprehensive admin and review capabilities

#### CEO Dashboard
- [ ] Employee overview with PDR status indicators
- [ ] Pending reviews and action items
- [ ] System-wide statistics and metrics
- [ ] Quick access to common admin functions

#### Review and Management
- [ ] Employee PDR review interface
  - [ ] Goal review and rating system
  - [ ] Behavior assessment and comments
  - [ ] Overall performance rating
- [ ] Lock/unlock functionality with permissions
- [ ] Bulk operations for multiple PDRs
- [ ] Status management and workflow controls

#### Company Values Management
- [ ] Create and edit company values
- [ ] Manage value descriptions and examples
- [ ] Activate/deactivate values
- [ ] Sort order management

#### Reporting and Audit
- [ ] PDR completion status reports
- [ ] Performance analytics and trends
- [ ] Audit trail viewer with filtering
- [ ] Data export capabilities (CSV, PDF)

**Deliverables**:
- Complete CEO admin dashboard
- PDR review and rating system
- Company values management
- Comprehensive reporting capabilities
- Audit trail and compliance features

### Phase 5: Polish and Optimization (Weeks 5-6)
**Objective**: Performance optimization, testing, and production readiness

#### Performance Optimization
- [ ] Database query optimization and indexing
- [ ] Component performance tuning with React.memo
- [ ] Bundle size optimization and code splitting
- [ ] Implement caching strategies
- [ ] Image and asset optimization

#### Testing and Quality Assurance
- [ ] Unit tests for utility functions
- [ ] Integration tests for key user flows
- [ ] End-to-end testing with Playwright
- [ ] Security testing and vulnerability assessment
- [ ] Performance testing and load testing

#### Documentation and Deployment
- [ ] API documentation with OpenAPI/Swagger
- [ ] User guides and admin documentation
- [ ] Deployment configuration and CI/CD
- [ ] Monitoring and logging setup
- [ ] Production environment configuration

#### Accessibility and UX Polish
- [ ] WCAG compliance testing and fixes
- [ ] Keyboard navigation optimization
- [ ] Screen reader compatibility
- [ ] Mobile responsiveness refinement
- [ ] User experience improvements

**Deliverables**:
- Production-ready application
- Comprehensive test suite
- Complete documentation
- Deployment and monitoring setup
- Accessibility compliance

### Success Metrics
- **Performance**: Page load times < 2 seconds
- **Accessibility**: WCAG 2.1 AA compliance
- **Test Coverage**: > 80% code coverage
- **Security**: Zero high/critical vulnerabilities
- **User Experience**: Intuitive navigation and clear workflows

---

## Deployment Architecture

### Production Environment
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │────│   Web Server    │────│    Database     │
│   (Nginx/ALB)   │    │   (Next.js)     │    │  (PostgreSQL)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         v                       v                       v
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CDN/Cache     │    │   File Storage  │    │   Monitoring    │
│   (CloudFlare)  │    │   (S3/Local)    │    │  (DataDog/etc)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Hosting Options

#### Option 1: Vercel (Recommended)
- **Pros**: Seamless Next.js integration, automatic deployments, global CDN
- **Cons**: Vendor lock-in, pricing at scale
- **Database**: Vercel Postgres or external PostgreSQL service
- **Monitoring**: Built-in analytics + external APM

#### Option 2: Self-Hosted
- **Infrastructure**: Docker containers with Kubernetes or Docker Compose
- **Database**: Self-managed PostgreSQL with replication
- **Load Balancing**: Nginx or cloud load balancer
- **Monitoring**: Prometheus + Grafana stack

### Environment Configuration
```bash
# Production Environment Variables
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=strong-secret-key
JWT_REFRESH_SECRET=another-strong-secret
NEXTAUTH_URL=https://pdr.company.com
NEXTAUTH_SECRET=nextauth-secret

# Optional integrations
SMTP_HOST=smtp.company.com
SMTP_USER=notifications@company.com
SMTP_PASS=smtp-password

# Monitoring
SENTRY_DSN=https://...
MONITORING_API_KEY=...
```

### Backup Strategy
- **Database**: Automated daily backups with 30-day retention
- **Application**: Git-based versioning with tagged releases
- **Configuration**: Infrastructure as Code (Terraform/CloudFormation)
- **Recovery**: Documented disaster recovery procedures

---

## Appendices

### Appendix A: TypeScript Type Definitions

```typescript
// Core entity types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 'EMPLOYEE' | 'CEO';

export interface PDR {
  id: string;
  userId: string;
  periodId: string;
  status: PDRStatus;
  isLocked: boolean;
  currentStep: number;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  user?: User;
  period?: PDRPeriod;
  goals?: Goal[];
  behaviors?: Behavior[];
  midYearReview?: MidYearReview;
  endYearReview?: EndYearReview;
}

export type PDRStatus = 
  | 'DRAFT' 
  | 'SUBMITTED' 
  | 'UNDER_REVIEW' 
  | 'MID_YEAR_CHECK' 
  | 'END_YEAR_REVIEW' 
  | 'COMPLETED' 
  | 'LOCKED';

export interface Goal {
  id: string;
  pdrId: string;
  title: string;
  description?: string;
  targetOutcome?: string;
  successCriteria?: string;
  priority: Priority;
  employeeProgress?: string;
  employeeRating?: number;
  ceoComments?: string;
  ceoRating?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Behavior {
  id: string;
  pdrId: string;
  valueId: string;
  description: string;
  examples?: string;
  employeeSelfAssessment?: string;
  employeeRating?: number;
  ceoComments?: string;
  ceoRating?: number;
  createdAt: Date;
  updatedAt: Date;
  
  value?: CompanyValue;
}

export interface CompanyValue {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
}

// API response types
export type Result<T, E = string> = 
  | { success: true; data: T }
  | { success: false; error: E };

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  timestamp: string;
}

// Form validation schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const goalSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  targetOutcome: z.string().optional(),
  successCriteria: z.string().optional(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
});

export const behaviorSchema = z.object({
  valueId: z.string().uuid('Invalid value ID'),
  description: z.string().min(1, 'Description is required'),
  examples: z.string().optional(),
  employeeSelfAssessment: z.string().optional(),
  employeeRating: z.number().min(1).max(5).optional(),
});
```

### Appendix B: Database Migrations

```sql
-- Initial migration: Create all tables
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'EMPLOYEE' CHECK (role IN ('EMPLOYEE', 'CEO')),
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- PDR periods
CREATE TABLE pdr_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- PDRs
CREATE TABLE pdrs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES pdr_periods(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'MID_YEAR_CHECK', 
    'END_YEAR_REVIEW', 'COMPLETED', 'LOCKED'
  )),
  is_locked BOOLEAN DEFAULT false,
  current_step INTEGER DEFAULT 1,
  submitted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, period_id)
);

-- Company values
CREATE TABLE company_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Goals
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pdr_id UUID NOT NULL REFERENCES pdrs(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  target_outcome TEXT,
  success_criteria TEXT,
  priority VARCHAR(10) DEFAULT 'MEDIUM' CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
  employee_progress TEXT,
  employee_rating INTEGER CHECK (employee_rating >= 1 AND employee_rating <= 5),
  ceo_comments TEXT,
  ceo_rating INTEGER CHECK (ceo_rating >= 1 AND ceo_rating <= 5),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Behaviors
CREATE TABLE behaviors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pdr_id UUID NOT NULL REFERENCES pdrs(id) ON DELETE CASCADE,
  value_id UUID NOT NULL REFERENCES company_values(id),
  description TEXT NOT NULL,
  examples TEXT,
  employee_self_assessment TEXT,
  employee_rating INTEGER CHECK (employee_rating >= 1 AND employee_rating <= 5),
  ceo_comments TEXT,
  ceo_rating INTEGER CHECK (ceo_rating >= 1 AND ceo_rating <= 5),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Mid-year reviews
CREATE TABLE mid_year_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pdr_id UUID NOT NULL REFERENCES pdrs(id) ON DELETE CASCADE,
  progress_summary TEXT NOT NULL,
  blockers_challenges TEXT,
  support_needed TEXT,
  employee_comments TEXT,
  ceo_feedback TEXT,
  submitted_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- End-year reviews
CREATE TABLE end_year_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pdr_id UUID NOT NULL REFERENCES pdrs(id) ON DELETE CASCADE,
  achievements_summary TEXT NOT NULL,
  learnings_growth TEXT,
  challenges_faced TEXT,
  next_year_goals TEXT,
  employee_overall_rating INTEGER CHECK (employee_overall_rating >= 1 AND employee_overall_rating <= 5),
  ceo_overall_rating INTEGER CHECK (ceo_overall_rating >= 1 AND ceo_overall_rating <= 5),
  ceo_final_comments TEXT,
  submitted_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(10) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_pdrs_user_period ON pdrs(user_id, period_id);
CREATE INDEX idx_pdrs_status ON pdrs(status);
CREATE INDEX idx_goals_pdr ON goals(pdr_id);
CREATE INDEX idx_behaviors_pdr ON behaviors(pdr_id);
CREATE INDEX idx_behaviors_value ON behaviors(value_id);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_changed_at ON audit_logs(changed_at);

-- Insert default company values
INSERT INTO company_values (name, description, sort_order) VALUES
('Innovation', 'We embrace creativity and continuous improvement', 1),
('Integrity', 'We act with honesty and transparency in all our dealings', 2),
('Collaboration', 'We work together to achieve common goals', 3),
('Excellence', 'We strive for the highest quality in everything we do', 4),
('Customer Focus', 'We put our customers at the center of our decisions', 5);
```

### Appendix C: Development Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "type-check": "tsc --noEmit",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:migrate:deploy": "prisma migrate deploy",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio",
    "db:reset": "prisma migrate reset",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "e2e": "playwright test",
    "e2e:ui": "playwright test --ui",
    "analyze": "ANALYZE=true next build",
    "clean": "rm -rf .next out dist coverage"
  }
}
```

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Approved By**: Solution Architect  
**Review Date**: Quarterly  

---

*This document serves as the definitive technical specification for the PDR System. All development work should reference and comply with the architecture outlined herein.*
