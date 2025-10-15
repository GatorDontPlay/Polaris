export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          id: string
          table_name: string
          record_id: string
          action: 'INSERT' | 'UPDATE' | 'DELETE'
          old_values: Json | null
          new_values: Json | null
          changed_by: string | null
          changed_at: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          table_name: string
          record_id: string
          action: 'INSERT' | 'UPDATE' | 'DELETE'
          old_values?: Json | null
          new_values?: Json | null
          changed_by?: string | null
          changed_at?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          table_name?: string
          record_id?: string
          action?: 'INSERT' | 'UPDATE' | 'DELETE'
          old_values?: Json | null
          new_values?: Json | null
          changed_by?: string | null
          changed_at?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      behavior_entries: {
        Row: {
          id: string
          pdr_id: string
          value_id: string
          author_id: string
          author_type: 'EMPLOYEE' | 'CEO'
          description: string
          examples: string | null
          self_assessment: string | null
          rating: number | null
          comments: string | null
          employee_entry_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pdr_id: string
          value_id: string
          author_id: string
          author_type: 'EMPLOYEE' | 'CEO'
          description: string
          examples?: string | null
          self_assessment?: string | null
          rating?: number | null
          comments?: string | null
          employee_entry_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          pdr_id?: string
          value_id?: string
          author_id?: string
          author_type?: 'EMPLOYEE' | 'CEO'
          description?: string
          examples?: string | null
          self_assessment?: string | null
          rating?: number | null
          comments?: string | null
          employee_entry_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "behavior_entries_pdr_id_fkey"
            columns: ["pdr_id"]
            isOneToOne: false
            referencedRelation: "pdrs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_entries_value_id_fkey"
            columns: ["value_id"]
            isOneToOne: false
            referencedRelation: "company_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_entries_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_entries_employee_entry_id_fkey"
            columns: ["employee_entry_id"]
            isOneToOne: false
            referencedRelation: "behavior_entries"
            referencedColumns: ["id"]
          }
        ]
      }
      behaviors: {
        Row: {
          id: string
          pdr_id: string
          value_id: string
          description: string
          examples: string | null
          employee_self_assessment: string | null
          employee_rating: number | null
          ceo_comments: string | null
          ceo_rating: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pdr_id: string
          value_id: string
          description: string
          examples?: string | null
          employee_self_assessment?: string | null
          employee_rating?: number | null
          ceo_comments?: string | null
          ceo_rating?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          pdr_id?: string
          value_id?: string
          description?: string
          examples?: string | null
          employee_self_assessment?: string | null
          employee_rating?: number | null
          ceo_comments?: string | null
          ceo_rating?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "behaviors_pdr_id_fkey"
            columns: ["pdr_id"]
            isOneToOne: false
            referencedRelation: "pdrs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behaviors_value_id_fkey"
            columns: ["value_id"]
            isOneToOne: false
            referencedRelation: "company_values"
            referencedColumns: ["id"]
          }
        ]
      }
      company_values: {
        Row: {
          id: string
          name: string
          description: string
          is_active: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      end_year_reviews: {
        Row: {
          id: string
          pdr_id: string
          achievements_summary: string
          learnings_growth: string | null
          challenges_faced: string | null
          next_year_goals: string | null
          employee_overall_rating: number | null
          ceo_overall_rating: number | null
          ceo_final_comments: string | null
          submitted_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pdr_id: string
          achievements_summary: string
          learnings_growth?: string | null
          challenges_faced?: string | null
          next_year_goals?: string | null
          employee_overall_rating?: number | null
          ceo_overall_rating?: number | null
          ceo_final_comments?: string | null
          submitted_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          pdr_id?: string
          achievements_summary?: string
          learnings_growth?: string | null
          challenges_faced?: string | null
          next_year_goals?: string | null
          employee_overall_rating?: number | null
          ceo_overall_rating?: number | null
          ceo_final_comments?: string | null
          submitted_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "end_year_reviews_pdr_id_fkey"
            columns: ["pdr_id"]
            isOneToOne: true
            referencedRelation: "pdrs"
            referencedColumns: ["id"]
          }
        ]
      }
      goals: {
        Row: {
          id: string
          pdr_id: string
          title: string
          description: string | null
          target_outcome: string | null
          success_criteria: string | null
          priority: 'HIGH' | 'MEDIUM' | 'LOW'
          weighting: number | null
          goal_mapping: 'PEOPLE_CULTURE' | 'VALUE_DRIVEN_INNOVATION' | 'OPERATING_EFFICIENCY' | 'CUSTOMER_EXPERIENCE' | null
          employee_progress: string | null
          employee_rating: number | null
          ceo_comments: string | null
          ceo_rating: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pdr_id: string
          title: string
          description?: string | null
          target_outcome?: string | null
          success_criteria?: string | null
          priority?: 'HIGH' | 'MEDIUM' | 'LOW'
          weighting?: number | null
          goal_mapping?: 'PEOPLE_CULTURE' | 'VALUE_DRIVEN_INNOVATION' | 'OPERATING_EFFICIENCY' | 'CUSTOMER_EXPERIENCE' | null
          employee_progress?: string | null
          employee_rating?: number | null
          ceo_comments?: string | null
          ceo_rating?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          pdr_id?: string
          title?: string
          description?: string | null
          target_outcome?: string | null
          success_criteria?: string | null
          priority?: 'HIGH' | 'MEDIUM' | 'LOW'
          weighting?: number | null
          goal_mapping?: 'PEOPLE_CULTURE' | 'VALUE_DRIVEN_INNOVATION' | 'OPERATING_EFFICIENCY' | 'CUSTOMER_EXPERIENCE' | null
          employee_progress?: string | null
          employee_rating?: number | null
          ceo_comments?: string | null
          ceo_rating?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_pdr_id_fkey"
            columns: ["pdr_id"]
            isOneToOne: false
            referencedRelation: "pdrs"
            referencedColumns: ["id"]
          }
        ]
      }
      mid_year_reviews: {
        Row: {
          id: string
          pdr_id: string
          progress_summary: string
          blockers_challenges: string | null
          support_needed: string | null
          employee_comments: string | null
          ceo_feedback: string | null
          submitted_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pdr_id: string
          progress_summary: string
          blockers_challenges?: string | null
          support_needed?: string | null
          employee_comments?: string | null
          ceo_feedback?: string | null
          submitted_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          pdr_id?: string
          progress_summary?: string
          blockers_challenges?: string | null
          support_needed?: string | null
          employee_comments?: string | null
          ceo_feedback?: string | null
          submitted_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mid_year_reviews_pdr_id_fkey"
            columns: ["pdr_id"]
            isOneToOne: true
            referencedRelation: "pdrs"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          pdr_id: string | null
          type: 'PDR_LOCKED' | 'PDR_SUBMITTED' | 'PDR_REMINDER'
          title: string
          message: string
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          pdr_id?: string | null
          type: 'PDR_LOCKED' | 'PDR_SUBMITTED' | 'PDR_REMINDER'
          title: string
          message: string
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          pdr_id?: string | null
          type?: 'PDR_LOCKED' | 'PDR_SUBMITTED' | 'PDR_REMINDER'
          title?: string
          message?: string
          read_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_pdr_id_fkey"
            columns: ["pdr_id"]
            isOneToOne: false
            referencedRelation: "pdrs"
            referencedColumns: ["id"]
          }
        ]
      }
      pdr_periods: {
        Row: {
          id: string
          name: string
          start_date: string
          end_date: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          start_date: string
          end_date: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          start_date?: string
          end_date?: string
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      pdrs: {
        Row: {
          id: string
          user_id: string
          period_id: string | null
          fy_label: string
          fy_start_date: string
          fy_end_date: string
          status: 'Created' | 'SUBMITTED' | 'PLAN_LOCKED' | 'MID_YEAR_SUBMITTED' | 'MID_YEAR_APPROVED' | 'END_YEAR_SUBMITTED' | 'COMPLETED'
          employee_fields: Json | null
          ceo_fields: Json | null
          meeting_booked: boolean
          meeting_booked_at: string | null
          locked_at: string | null
          locked_by: string | null
          is_locked: boolean
          current_step: number
          calibrated_at: string | null
          calibrated_by: string | null
          submitted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          period_id?: string | null
          fy_label: string
          fy_start_date: string
          fy_end_date: string
          status?: 'Created' | 'SUBMITTED' | 'PLAN_LOCKED' | 'MID_YEAR_SUBMITTED' | 'MID_YEAR_APPROVED' | 'END_YEAR_SUBMITTED' | 'COMPLETED'
          employee_fields?: Json | null
          ceo_fields?: Json | null
          meeting_booked?: boolean
          meeting_booked_at?: string | null
          locked_at?: string | null
          locked_by?: string | null
          is_locked?: boolean
          current_step?: number
          calibrated_at?: string | null
          calibrated_by?: string | null
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          period_id?: string | null
          fy_label?: string
          fy_start_date?: string
          fy_end_date?: string
          status?: 'Created' | 'SUBMITTED' | 'PLAN_LOCKED' | 'MID_YEAR_SUBMITTED' | 'MID_YEAR_APPROVED' | 'END_YEAR_SUBMITTED' | 'COMPLETED'
          employee_fields?: Json | null
          ceo_fields?: Json | null
          meeting_booked?: boolean
          meeting_booked_at?: string | null
          locked_at?: string | null
          locked_by?: string | null
          is_locked?: boolean
          current_step?: number
          calibrated_at?: string | null
          calibrated_by?: string | null
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdrs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdrs_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "pdr_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdrs_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          updated_at: string | null
          email: string
          first_name: string
          last_name: string
          role: 'EMPLOYEE' | 'CEO'
          avatar_url: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id: string
          updated_at?: string | null
          email: string
          first_name: string
          last_name: string
          role?: 'EMPLOYEE' | 'CEO'
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          updated_at?: string | null
          email?: string
          first_name?: string
          last_name?: string
          role?: 'EMPLOYEE' | 'CEO'
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      audit_action: 'INSERT' | 'UPDATE' | 'DELETE'
      behavior_author_type: 'EMPLOYEE' | 'CEO'
      notification_type: 'PDR_LOCKED' | 'PDR_SUBMITTED' | 'PDR_REMINDER'
      pdr_status: 'Created' | 'SUBMITTED' | 'PLAN_LOCKED' | 'MID_YEAR_SUBMITTED' | 'MID_YEAR_APPROVED' | 'END_YEAR_SUBMITTED' | 'COMPLETED'
      priority: 'HIGH' | 'MEDIUM' | 'LOW'
      user_role: 'EMPLOYEE' | 'CEO'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Utility types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// Table types for easier imports
export type Profile = Tables<'profiles'>
export type PDR = Tables<'pdrs'>
export type Goal = Tables<'goals'>
export type CompanyValue = Tables<'company_values'>
export type Behavior = Tables<'behaviors'>
export type BehaviorEntry = Tables<'behavior_entries'>
export type MidYearReview = Tables<'mid_year_reviews'>
export type EndYearReview = Tables<'end_year_reviews'>
export type AuditLog = Tables<'audit_logs'>
export type Notification = Tables<'notifications'>
export type PDRPeriod = Tables<'pdr_periods'>

// Enum types for easier imports
export type UserRole = Enums<'user_role'>
export type PDRStatus = Enums<'pdr_status'>
export type Priority = Enums<'priority'>
export type AuditAction = Enums<'audit_action'>
export type NotificationType = Enums<'notification_type'>
export type BehaviorAuthorType = Enums<'behavior_author_type'>

// Insert and Update types
export type PDRInsert = Database['public']['Tables']['pdrs']['Insert']
export type PDRUpdate = Database['public']['Tables']['pdrs']['Update']
export type GoalInsert = Database['public']['Tables']['goals']['Insert']
export type GoalUpdate = Database['public']['Tables']['goals']['Update']
export type BehaviorInsert = Database['public']['Tables']['behaviors']['Insert']
export type BehaviorUpdate = Database['public']['Tables']['behaviors']['Update']
export type BehaviorEntryInsert = Database['public']['Tables']['behavior_entries']['Insert']
export type BehaviorEntryUpdate = Database['public']['Tables']['behavior_entries']['Update']
export type MidYearReviewInsert = Database['public']['Tables']['mid_year_reviews']['Insert']
export type MidYearReviewUpdate = Database['public']['Tables']['mid_year_reviews']['Update']
export type EndYearReviewInsert = Database['public']['Tables']['end_year_reviews']['Insert']
export type EndYearReviewUpdate = Database['public']['Tables']['end_year_reviews']['Update']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert']
export type NotificationUpdate = Database['public']['Tables']['notifications']['Update']

// Extended types with relationships (for complex queries)
export type PDRWithRelations = PDR & {
  user: Profile
  period?: PDRPeriod
  locked_by_user?: Profile
  goals?: Goal[]
  behaviors?: (Behavior & { value: CompanyValue })[]
  behavior_entries?: (BehaviorEntry & { value: CompanyValue; author: Profile })[]
  mid_year_review?: MidYearReview
  end_year_review?: EndYearReview
  notifications?: Notification[]
}

export type BehaviorEntryWithRelations = BehaviorEntry & {
  pdr: PDR
  value: CompanyValue
  author: Profile
  employee_entry?: BehaviorEntry
  ceo_entries?: BehaviorEntry[]
}

export type OrganizedBehaviorData = {
  company_value: CompanyValue
  employee_entries: (BehaviorEntry & { ceo_reviews: BehaviorEntry[] })[]
  standalone_ceo_entries: BehaviorEntry[]
  has_employee_entry: boolean
  has_ceo_entry: boolean
  total_entries: number
}