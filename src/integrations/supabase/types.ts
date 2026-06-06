export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          address: string | null
          category: string
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          owner_id: string
          phone: string | null
          portal_token: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          category?: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_id: string
          phone?: string | null
          portal_token?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          category?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
          portal_token?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          company_name: string | null
          created_at: string
          logo_url: string | null
          owner_id: string
          pix_instructions: string | null
          pix_key: string | null
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          logo_url?: string | null
          owner_id: string
          pix_instructions?: string | null
          pix_key?: string | null
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          logo_url?: string | null
          owner_id?: string
          pix_instructions?: string | null
          pix_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_cents: number
          client_id: string
          confirmed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          job_id: string | null
          notes: string | null
          owner_id: string
          paid_at: string | null
          payment_proof_path: string | null
          quote_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          amount_cents?: number
          client_id: string
          confirmed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          job_id?: string | null
          notes?: string | null
          owner_id: string
          paid_at?: string | null
          payment_proof_path?: string | null
          quote_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          client_id?: string
          confirmed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          job_id?: string | null
          notes?: string | null
          owner_id?: string
          paid_at?: string | null
          payment_proof_path?: string | null
          quote_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          address: string | null
          checklist: Json
          client_id: string | null
          created_at: string
          duration_minutes: number
          id: string
          notes: string | null
          owner_id: string
          price_cents: number
          scheduled_at: string
          status: string
          team_id: string | null
          team_name: string | null
          title: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          checklist?: Json
          client_id?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          owner_id: string
          price_cents?: number
          scheduled_at: string
          status?: string
          team_id?: string | null
          team_name?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          checklist?: Json
          client_id?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          owner_id?: string
          price_cents?: number
          scheduled_at?: string
          status?: string
          team_id?: string | null
          team_name?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          approved_at: string | null
          client_id: string
          created_at: string
          id: string
          items: Json
          notes: string | null
          owner_id: string
          status: string
          title: string
          total_cents: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          approved_at?: string | null
          client_id: string
          created_at?: string
          id?: string
          items?: Json
          notes?: string | null
          owner_id: string
          status?: string
          title: string
          total_cents?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          approved_at?: string | null
          client_id?: string
          created_at?: string
          id?: string
          items?: Json
          notes?: string | null
          owner_id?: string
          status?: string
          title?: string
          total_cents?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      team_locations: {
        Row: {
          accuracy_m: number | null
          created_at: string
          heading: number | null
          id: string
          lat: number
          lng: number
          owner_id: string
          recorded_at: string
          speed: number | null
          team_id: string
          updated_at: string
        }
        Insert: {
          accuracy_m?: number | null
          created_at?: string
          heading?: number | null
          id?: string
          lat: number
          lng: number
          owner_id: string
          recorded_at?: string
          speed?: number | null
          team_id: string
          updated_at?: string
        }
        Update: {
          accuracy_m?: number | null
          created_at?: string
          heading?: number | null
          id?: string
          lat?: number
          lng?: number
          owner_id?: string
          recorded_at?: string
          speed?: number | null
          team_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          phone: string | null
          role: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          phone?: string | null
          role?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          phone?: string | null
          role?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
