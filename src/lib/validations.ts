import { z } from 'zod';

// Authentication schemas
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters'),
});

export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .toLowerCase(),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must be less than 100 characters')
    .regex(/^[a-zA-Z\s-']+$/, 'First name contains invalid characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be less than 100 characters')
    .regex(/^[a-zA-Z\s-']+$/, 'Last name contains invalid characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
  role: z.enum(['EMPLOYEE', 'CEO']).default('EMPLOYEE'),
});

// Goal schemas
export const goalSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be less than 255 characters'),
  description: z
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  targetOutcome: z
    .string()
    .max(1000, 'Target outcome must be less than 1000 characters')
    .optional(),
  successCriteria: z
    .string()
    .max(1000, 'Success criteria must be less than 1000 characters')
    .optional(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
});

export const goalUpdateSchema = goalSchema.extend({
  employeeProgress: z
    .string()
    .max(1000, 'Progress must be less than 1000 characters')
    .optional(),
  employeeRating: z
    .number()
    .int()
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5')
    .optional(),
  ceoComments: z
    .string()
    .max(1000, 'Comments must be less than 1000 characters')
    .optional(),
  ceoRating: z
    .number()
    .int()
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5')
    .optional(),
});

// Behavior schemas
export const behaviorSchema = z.object({
  valueId: z.string().uuid('Invalid value ID'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(1000, 'Description must be less than 1000 characters'),
  examples: z
    .string()
    .max(1000, 'Examples must be less than 1000 characters')
    .optional(),
});

export const behaviorUpdateSchema = behaviorSchema.extend({
  employeeSelfAssessment: z
    .string()
    .max(1000, 'Self assessment must be less than 1000 characters')
    .optional(),
  employeeRating: z
    .number()
    .int()
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5')
    .optional(),
  ceoComments: z
    .string()
    .max(1000, 'Comments must be less than 1000 characters')
    .optional(),
  ceoRating: z
    .number()
    .int()
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5')
    .optional(),
});

// PDR schemas
export const pdrUpdateSchema = z.object({
  status: z.enum([
    'DRAFT',
    'SUBMITTED',
    'UNDER_REVIEW',
    'MID_YEAR_CHECK',
    'END_YEAR_REVIEW',
    'COMPLETED',
    'LOCKED',
  ]),
  currentStep: z
    .number()
    .int()
    .min(1, 'Step must be at least 1')
    .max(5, 'Step must be at most 5'),
  isLocked: z.boolean(),
});

// Mid-year review schemas
export const midYearReviewSchema = z.object({
  progressSummary: z
    .string()
    .min(1, 'Progress summary is required')
    .max(2000, 'Progress summary must be less than 2000 characters'),
  blockersChallenges: z
    .string()
    .max(2000, 'Blockers and challenges must be less than 2000 characters')
    .optional(),
  supportNeeded: z
    .string()
    .max(2000, 'Support needed must be less than 2000 characters')
    .optional(),
  employeeComments: z
    .string()
    .max(2000, 'Employee comments must be less than 2000 characters')
    .optional(),
  ceoFeedback: z
    .string()
    .max(2000, 'CEO feedback must be less than 2000 characters')
    .optional(),
});

// End-year review schemas
export const endYearReviewSchema = z.object({
  achievementsSummary: z
    .string()
    .min(1, 'Achievements summary is required')
    .max(2000, 'Achievements summary must be less than 2000 characters'),
  learningsGrowth: z
    .string()
    .max(2000, 'Learnings and growth must be less than 2000 characters')
    .optional(),
  challengesFaced: z
    .string()
    .max(2000, 'Challenges faced must be less than 2000 characters')
    .optional(),
  nextYearGoals: z
    .string()
    .max(2000, 'Next year goals must be less than 2000 characters')
    .optional(),
  employeeOverallRating: z
    .number()
    .int()
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5')
    .optional(),
  ceoOverallRating: z
    .number()
    .int()
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5')
    .optional(),
  ceoFinalComments: z
    .string()
    .max(2000, 'CEO final comments must be less than 2000 characters')
    .optional(),
});

// Company value schemas
export const companyValueSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(1000, 'Description must be less than 1000 characters'),
  sortOrder: z.number().int().min(0, 'Sort order must be non-negative'),
  isActive: z.boolean().default(true),
});

// PDR period schemas
export const pdrPeriodSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  isActive: z.boolean().default(false),
}).refine(
  (data) => data.endDate > data.startDate,
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
);

// Filter schemas
export const pdrFiltersSchema = z.object({
  status: z.array(z.enum([
    'DRAFT',
    'SUBMITTED',
    'UNDER_REVIEW',
    'MID_YEAR_CHECK',
    'END_YEAR_REVIEW',
    'COMPLETED',
    'LOCKED',
  ])).optional(),
  period: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  search: z.string().max(255).optional(),
});

export const employeeFiltersSchema = z.object({
  role: z.array(z.enum(['EMPLOYEE', 'CEO'])).optional(),
  isActive: z.boolean().optional(),
  search: z.string().max(255).optional(),
});

// Pagination schema
export const paginationSchema = z.object({
  page: z
    .number()
    .int()
    .min(1, 'Page must be at least 1')
    .default(1),
  limit: z
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must be at most 100')
    .default(10),
});

// API response schemas
export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.array(z.object({
    field: z.string(),
    message: z.string(),
  })).optional(),
  timestamp: z.string(),
});

export const apiSuccessSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    timestamp: z.string(),
  });

// Type exports
export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
export type GoalData = z.infer<typeof goalSchema>;
export type GoalUpdateData = z.infer<typeof goalUpdateSchema>;
export type BehaviorData = z.infer<typeof behaviorSchema>;
export type BehaviorUpdateData = z.infer<typeof behaviorUpdateSchema>;
export type PDRUpdateData = z.infer<typeof pdrUpdateSchema>;
export type MidYearReviewData = z.infer<typeof midYearReviewSchema>;
export type EndYearReviewData = z.infer<typeof endYearReviewSchema>;
export type CompanyValueData = z.infer<typeof companyValueSchema>;
export type PDRPeriodData = z.infer<typeof pdrPeriodSchema>;
export type PDRFiltersData = z.infer<typeof pdrFiltersSchema>;
export type EmployeeFiltersData = z.infer<typeof employeeFiltersSchema>;
export type PaginationData = z.infer<typeof paginationSchema>;
