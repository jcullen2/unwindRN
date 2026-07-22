// Types for the v3 schema (supabase/migrations/20260716010000_v3_rebuild.sql).
// Hand-maintained to match the migration exactly; regenerate with
// `supabase gen types typescript` when convenient.
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
          display_name: string | null
          specialty: string | null
          years_in: number | null
          shifts_per_week: number | null
          usual_shift_hours: number | null
          est_career_shifts: number | null
          est_career_hours: number | null
          hospital: string | null
          city: string | null
          unit: string | null
          shift_pattern: string | null
          created_at: string | null
        }
        Insert: {
          id: string
          display_name?: string | null
          specialty?: string | null
          years_in?: number | null
          shifts_per_week?: number | null
          usual_shift_hours?: number | null
          est_career_shifts?: number | null
          est_career_hours?: number | null
          hospital?: string | null
          city?: string | null
          unit?: string | null
          shift_pattern?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          display_name?: string | null
          specialty?: string | null
          years_in?: number | null
          shifts_per_week?: number | null
          usual_shift_hours?: number | null
          est_career_shifts?: number | null
          est_career_hours?: number | null
          hospital?: string | null
          city?: string | null
          unit?: string | null
          shift_pattern?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      shifts: {
        Row: {
          id: string
          user_id: string
          shift_date: string
          hours: number
          load: number | null
          tags: string[] | null
          started_at: string | null
          ended_at: string | null
          is_night: boolean | null
          win: string | null
          weight: string | null
          lesson: string | null
          source: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          shift_date: string
          hours: number
          load?: number | null
          tags?: string[] | null
          started_at?: string | null
          ended_at?: string | null
          is_night?: boolean | null
          win?: string | null
          weight?: string | null
          lesson?: string | null
          source?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          shift_date?: string
          hours?: number
          load?: number | null
          tags?: string[] | null
          started_at?: string | null
          ended_at?: string | null
          is_night?: boolean | null
          win?: string | null
          weight?: string | null
          lesson?: string | null
          source?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      debrief_sessions: {
        Row: {
          id: string
          user_id: string
          shift_id: string | null
          transcript: Json
          mode: string | null
          started_at: string | null
          ended_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          shift_id?: string | null
          transcript?: Json
          mode?: string | null
          started_at?: string | null
          ended_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          shift_id?: string | null
          transcript?: Json
          mode?: string | null
          started_at?: string | null
          ended_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'debrief_sessions_shift_id_fkey'
            columns: ['shift_id']
            isOneToOne: false
            referencedRelation: 'shifts'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update']
