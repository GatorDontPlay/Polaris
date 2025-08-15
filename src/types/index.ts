// Core types for the PDR system based on Prisma schema

export type UserRole = 'EMPLOYEE' | 'CEO';

// Form types
export interface LoginFormData {
  email: string;
  password: string;
}

export type PDRStatus = 
  | 'Created'
  | 'OPEN_FOR_REVIEW'
  | 'PLAN_LOCKED'
  | 'PDR_BOOKED'
  | 'DRAFT' 
  | 'SUBMITTED' 
  | 'UNDER_REVIEW' 
  | 'MID_YEAR_CHECK' 
  | 'END_YEAR_REVIEW' 
  | 'COMPLETED' 
  | 'LOCKED';

export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE';

export type NotificationType = 'PDR_LOCKED' | 'PDR_SUBMITTED' | 'PDR_REMINDER';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  passwordHash: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PDRPeriod {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
}

export interface PDR {
  id: string;
  userId: string;
  periodId?: string;
  fyLabel: string;
  fyStartDate: Date;
  fyEndDate: Date;
  status: PDRStatus;
  employeeFields?: Record<string, unknown>;
  ceoFields?: Record<string, unknown>;
  meetingBooked: boolean;
  meetingBookedAt?: Date;
  lockedAt?: Date;
  lockedBy?: string;
  isLocked: boolean;
  currentStep: number;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  user?: User;
  period?: PDRPeriod;
  lockedByUser?: User;
  goals?: Goal[];
  behaviors?: Behavior[];
  midYearReview?: MidYearReview;
  endYearReview?: EndYearReview;
  notifications?: Notification[];
}

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

export interface CompanyValue {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
}

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
  
  // Relations
  value?: CompanyValue;
}

export interface MidYearReview {
  id: string;
  pdrId: string;
  progressSummary: string;
  blockersChallenges?: string;
  supportNeeded?: string;
  employeeComments?: string;
  ceoFeedback?: string;
  submittedAt: Date;
  createdAt: Date;
}

export interface EndYearReview {
  id: string;
  pdrId: string;
  achievementsSummary: string;
  learningsGrowth?: string;
  challengesFaced?: string;
  nextYearGoals?: string;
  employeeOverallRating?: number;
  ceoOverallRating?: number;
  ceoFinalComments?: string;
  submittedAt: Date;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  tableName: string;
  recordId: string;
  action: AuditAction;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  changedBy?: string;
  changedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  
  // Relations
  user?: User;
}

export interface Notification {
  id: string;
  userId: string;
  pdrId?: string;
  type: NotificationType;
  title: string;
  message: string;
  readAt?: Date;
  createdAt: Date;
  
  // Relations
  user?: User;
  pdr?: PDR;
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

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Authentication types
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// Form types
export interface GoalFormData {
  title: string;
  description?: string;
  targetOutcome?: string;
  successCriteria?: string;
  priority: Priority;
}

export interface BehaviorFormData {
  valueId: string;
  description: string;
  examples?: string;
  employeeSelfAssessment?: string;
  employeeRating?: number;
}

export interface MidYearFormData {
  progressSummary: string;
  blockersChallenges?: string;
  supportNeeded?: string;
  employeeComments?: string;
}

export interface EndYearFormData {
  achievementsSummary: string;
  learningsGrowth?: string;
  challengesFaced?: string;
  nextYearGoals?: string;
  employeeOverallRating?: number;
}

// Component props types
export interface PDRCardProps {
  pdr: PDR;
  onViewDetails: (pdrId: string) => void;
  onContinue?: (pdrId: string) => void;
}

export interface StepperProps {
  currentStep: number;
  totalSteps: number;
  steps: StepInfo[];
  onStepClick?: (step: number) => void;
}

export interface StepInfo {
  number: number;
  title: string;
  description: string;
  completed: boolean;
  active: boolean;
}

export interface RatingInputProps {
  value?: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

// Utility types
export type PDRWithRelations = PDR & {
  user: User;
  period: PDRPeriod;
  goals: Goal[];
  behaviors: (Behavior & { value: CompanyValue })[];
  midYearReview?: MidYearReview;
  endYearReview?: EndYearReview;
};

export type UserWithPDRs = User & {
  pdrs: PDR[];
};

// Filter and search types
export interface PDRFilters {
  status?: PDRStatus[];
  period?: string;
  userId?: string;
  search?: string;
}

export interface EmployeeFilters {
  role?: UserRole[];
  isActive?: boolean;
  search?: string;
}

// Dashboard data types
export interface DashboardStats {
  totalEmployees: number;
  pendingReviews: number;
  completedPDRs: number;
  overduePDRs: number;
  averageRating: number;
}

export interface EmployeeDashboardData {
  currentPDR?: PDR;
  stats: {
    completedPDRs: number;
    currentGoals: number;
    averageRating: number;
  };
  recentPDRs: PDR[];
}

export interface CEODashboardData {
  stats: DashboardStats;
  recentActivity: ActivityItem[];
  pendingReviews: PDR[];
}

export interface ActivityItem {
  id: string;
  type: 'pdr_submitted' | 'review_completed' | 'deadline_approaching';
  user: Pick<User, 'id' | 'firstName' | 'lastName'>;
  message: string;
  timestamp: Date;
}

// Error types
export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: ValidationError[];
}

// Date formatting types (Australian format)
export interface DateFormatOptions {
  format: 'short' | 'medium' | 'long';
  includeTime?: boolean;
  locale?: 'en-AU';
}

// Theme types
export * from './theme';
