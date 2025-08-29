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
      user_role: 'EMPLOYEE' | 'CEO'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
