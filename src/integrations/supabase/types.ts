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
      client_credits: {
        Row: {
          balance_cents: number
          client_id: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          balance_cents?: number
          client_id: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          balance_cents?: number
          client_id?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
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
          referral_code: string | null
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
          referral_code?: string | null
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
          referral_code?: string | null
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
          reactivation_days: number
          reactivation_discount_cents: number
          referral_credit_cents: number
          sms_confirmation_enabled: boolean
          sms_reminder_24h_enabled: boolean
          sms_reminder_2h_enabled: boolean
          sms_review_request_enabled: boolean
          twilio_from_number: string | null
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          logo_url?: string | null
          owner_id: string
          pix_instructions?: string | null
          pix_key?: string | null
          reactivation_days?: number
          reactivation_discount_cents?: number
          referral_credit_cents?: number
          sms_confirmation_enabled?: boolean
          sms_reminder_24h_enabled?: boolean
          sms_reminder_2h_enabled?: boolean
          sms_review_request_enabled?: boolean
          twilio_from_number?: string | null
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          logo_url?: string | null
          owner_id?: string
          pix_instructions?: string | null
          pix_key?: string | null
          reactivation_days?: number
          reactivation_discount_cents?: number
          referral_credit_cents?: number
          sms_confirmation_enabled?: boolean
          sms_reminder_24h_enabled?: boolean
          sms_reminder_2h_enabled?: boolean
          sms_review_request_enabled?: boolean
          twilio_from_number?: string | null
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
      job_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          job_id: string
          kind: string
          owner_id: string
          path: string
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          job_id: string
          kind: string
          owner_id: string
          path: string
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          job_id?: string
          kind?: string
          owner_id?: string
          path?: string
          updated_at?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          address: string | null
          arrived_at: string | null
          auto_check_in_enabled: boolean
          checklist: Json
          client_id: string | null
          created_at: string
          duration_minutes: number
          geofence_radius_m: number
          id: string
          lat: number | null
          lng: number | null
          notes: string | null
          owner_id: string
          price_cents: number
          scheduled_at: string
          signature_path: string | null
          signed_at: string | null
          signed_by_name: string | null
          status: string
          team_id: string | null
          team_name: string | null
          title: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          arrived_at?: string | null
          auto_check_in_enabled?: boolean
          checklist?: Json
          client_id?: string | null
          created_at?: string
          duration_minutes?: number
          geofence_radius_m?: number
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          owner_id: string
          price_cents?: number
          scheduled_at: string
          signature_path?: string | null
          signed_at?: string | null
          signed_by_name?: string | null
          status?: string
          team_id?: string | null
          team_name?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          arrived_at?: string | null
          auto_check_in_enabled?: boolean
          checklist?: Json
          client_id?: string | null
          created_at?: string
          duration_minutes?: number
          geofence_radius_m?: number
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          owner_id?: string
          price_cents?: number
          scheduled_at?: string
          signature_path?: string | null
          signed_at?: string | null
          signed_by_name?: string | null
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
      nps_surveys: {
        Row: {
          client_id: string | null
          comment: string | null
          created_at: string
          id: string
          job_id: string
          owner_id: string
          score: number | null
          sent_at: string | null
          submitted_at: string | null
          token: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          job_id: string
          owner_id: string
          score?: number | null
          sent_at?: string | null
          submitted_at?: string | null
          token?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          job_id?: string
          owner_id?: string
          score?: number | null
          sent_at?: string | null
          submitted_at?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: []
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
      reactivation_coupons: {
        Row: {
          client_id: string
          code: string
          created_at: string
          discount_cents: number
          expires_on: string
          id: string
          owner_id: string
          redeemed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          code: string
          created_at?: string
          discount_cents?: number
          expires_on: string
          id?: string
          owner_id: string
          redeemed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          code?: string
          created_at?: string
          discount_cents?: number
          expires_on?: string
          id?: string
          owner_id?: string
          redeemed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      recurring_schedules: {
        Row: {
          active: boolean
          address: string | null
          client_id: string
          created_at: string
          day_of_month: number | null
          day_of_week: number | null
          duration_minutes: number
          frequency: string
          id: string
          last_generated_at: string | null
          next_run_on: string
          notes: string | null
          owner_id: string
          price_cents: number
          team_id: string | null
          time_of_day: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          client_id: string
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          duration_minutes?: number
          frequency: string
          id?: string
          last_generated_at?: string | null
          next_run_on: string
          notes?: string | null
          owner_id: string
          price_cents?: number
          team_id?: string | null
          time_of_day?: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          client_id?: string
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          duration_minutes?: number
          frequency?: string
          id?: string
          last_generated_at?: string | null
          next_run_on?: string
          notes?: string | null
          owner_id?: string
          price_cents?: number
          team_id?: string | null
          time_of_day?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          code: string
          created_at: string
          credit_cents: number
          earned_at: string | null
          id: string
          owner_id: string
          redeemed_at: string | null
          referred_client_id: string | null
          referred_email: string | null
          referred_name: string | null
          referrer_client_id: string
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          credit_cents?: number
          earned_at?: string | null
          id?: string
          owner_id: string
          redeemed_at?: string | null
          referred_client_id?: string | null
          referred_email?: string | null
          referred_name?: string | null
          referrer_client_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          credit_cents?: number
          earned_at?: string | null
          id?: string
          owner_id?: string
          redeemed_at?: string | null
          referred_client_id?: string | null
          referred_email?: string | null
          referred_name?: string | null
          referrer_client_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          allowed: boolean
          created_at: string
          id: string
          org_owner_id: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          allowed?: boolean
          created_at?: string
          id?: string
          org_owner_id: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          allowed?: boolean
          created_at?: string
          id?: string
          org_owner_id?: string
          permission?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      service_catalog: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          default_duration_minutes: number
          default_price_cents: number
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          default_duration_minutes?: number
          default_price_cents?: number
          description?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          default_duration_minutes?: number
          default_price_cents?: number
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sms_messages: {
        Row: {
          attempts: number
          body: string
          client_id: string | null
          created_at: string
          error: string | null
          from_number: string | null
          id: string
          job_id: string | null
          kind: string
          owner_id: string
          provider_sid: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: string
          to_number: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          body: string
          client_id?: string | null
          created_at?: string
          error?: string | null
          from_number?: string | null
          id?: string
          job_id?: string | null
          kind: string
          owner_id: string
          provider_sid?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          to_number: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          body?: string
          client_id?: string | null
          created_at?: string
          error?: string | null
          from_number?: string | null
          id?: string
          job_id?: string | null
          kind?: string
          owner_id?: string
          provider_sid?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          to_number?: string
          updated_at?: string
        }
        Relationships: []
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          org_owner_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_owner_id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_owner_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_org_owner: { Args: { _uid: string }; Returns: string }
      has_permission: {
        Args: { _permission: string; _uid: string }
        Returns: boolean
      }
      is_org_admin: { Args: { _uid: string }; Returns: boolean }
      operator_can_access_job: {
        Args: { _team_id: string; _uid: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "operator"
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
    Enums: {
      app_role: ["admin", "operator"],
    },
  },
} as const
