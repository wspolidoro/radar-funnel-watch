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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_usage_log: {
        Row: {
          action: string
          created_at: string
          credits_used: number
          id: string
          model_used: string | null
          tokens_input: number | null
          tokens_output: number | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          credits_used?: number
          id?: string
          model_used?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          credits_used?: number
          id?: string
          model_used?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          user_id?: string
        }
        Relationships: []
      }
      captured_newsletters: {
        Row: {
          alias_id: string | null
          analyzed_at: string | null
          category: string | null
          competitor_id: string | null
          confirmation_link: string | null
          created_at: string
          ctas: Json | null
          email_type: string | null
          from_email: string
          from_name: string | null
          has_images: boolean | null
          html_content: string | null
          id: string
          is_processed: boolean | null
          links_count: number | null
          optin_status: string | null
          received_at: string
          seed_id: string | null
          sentiment: string | null
          subject: string
          text_content: string | null
          word_count: number | null
        }
        Insert: {
          alias_id?: string | null
          analyzed_at?: string | null
          category?: string | null
          competitor_id?: string | null
          confirmation_link?: string | null
          created_at?: string
          ctas?: Json | null
          email_type?: string | null
          from_email: string
          from_name?: string | null
          has_images?: boolean | null
          html_content?: string | null
          id?: string
          is_processed?: boolean | null
          links_count?: number | null
          optin_status?: string | null
          received_at: string
          seed_id?: string | null
          sentiment?: string | null
          subject: string
          text_content?: string | null
          word_count?: number | null
        }
        Update: {
          alias_id?: string | null
          analyzed_at?: string | null
          category?: string | null
          competitor_id?: string | null
          confirmation_link?: string | null
          created_at?: string
          ctas?: Json | null
          email_type?: string | null
          from_email?: string
          from_name?: string | null
          has_images?: boolean | null
          html_content?: string | null
          id?: string
          is_processed?: boolean | null
          links_count?: number | null
          optin_status?: string | null
          received_at?: string
          seed_id?: string | null
          sentiment?: string | null
          subject?: string
          text_content?: string | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "captured_newsletters_alias_id_fkey"
            columns: ["alias_id"]
            isOneToOne: false
            referencedRelation: "email_aliases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "captured_newsletters_seed_id_fkey"
            columns: ["seed_id"]
            isOneToOne: false
            referencedRelation: "email_seeds"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      connectivity_tests: {
        Row: {
          domain_id: string | null
          error_message: string | null
          id: string
          latency_ms: number | null
          received_at: string | null
          sent_at: string | null
          status: string | null
          test_alias: string
          user_id: string
        }
        Insert: {
          domain_id?: string | null
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          received_at?: string | null
          sent_at?: string | null
          status?: string | null
          test_alias: string
          user_id: string
        }
        Update: {
          domain_id?: string | null
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          received_at?: string | null
          sent_at?: string | null
          status?: string | null
          test_alias?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connectivity_tests_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "email_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      data_leak_alerts: {
        Row: {
          actual_domain: string
          alias_id: string | null
          created_at: string
          expected_domain: string | null
          from_email: string
          id: string
          is_notified: boolean | null
          is_read: boolean | null
          newsletter_id: string | null
          notified_at: string | null
          severity: string | null
          user_id: string
        }
        Insert: {
          actual_domain: string
          alias_id?: string | null
          created_at?: string
          expected_domain?: string | null
          from_email: string
          id?: string
          is_notified?: boolean | null
          is_read?: boolean | null
          newsletter_id?: string | null
          notified_at?: string | null
          severity?: string | null
          user_id: string
        }
        Update: {
          actual_domain?: string
          alias_id?: string | null
          created_at?: string
          expected_domain?: string | null
          from_email?: string
          id?: string
          is_notified?: boolean | null
          is_read?: boolean | null
          newsletter_id?: string | null
          notified_at?: string | null
          severity?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_leak_alerts_alias_id_fkey"
            columns: ["alias_id"]
            isOneToOne: false
            referencedRelation: "email_aliases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_leak_alerts_newsletter_id_fkey"
            columns: ["newsletter_id"]
            isOneToOne: false
            referencedRelation: "captured_newsletters"
            referencedColumns: ["id"]
          },
        ]
      }
      email_aliases: {
        Row: {
          alias: string
          created_at: string
          description: string | null
          domain: string
          email_count: number | null
          first_email_at: string | null
          id: string
          is_confirmed: boolean | null
          local_part: string
          name: string | null
          sender_category: string | null
          sender_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alias: string
          created_at?: string
          description?: string | null
          domain: string
          email_count?: number | null
          first_email_at?: string | null
          id?: string
          is_confirmed?: boolean | null
          local_part: string
          name?: string | null
          sender_category?: string | null
          sender_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alias?: string
          created_at?: string
          description?: string | null
          domain?: string
          email_count?: number | null
          first_email_at?: string | null
          id?: string
          is_confirmed?: boolean | null
          local_part?: string
          name?: string | null
          sender_category?: string | null
          sender_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_domains: {
        Row: {
          created_at: string
          dns_status: string | null
          dns_verified_at: string | null
          domain: string
          id: string
          is_active: boolean | null
          is_platform_domain: boolean | null
          is_verified: boolean | null
          mx_records: Json | null
          provider: string
          updated_at: string
          user_id: string
          webhook_secret: string | null
        }
        Insert: {
          created_at?: string
          dns_status?: string | null
          dns_verified_at?: string | null
          domain: string
          id?: string
          is_active?: boolean | null
          is_platform_domain?: boolean | null
          is_verified?: boolean | null
          mx_records?: Json | null
          provider?: string
          updated_at?: string
          user_id: string
          webhook_secret?: string | null
        }
        Update: {
          created_at?: string
          dns_status?: string | null
          dns_verified_at?: string | null
          domain?: string
          id?: string
          is_active?: boolean | null
          is_platform_domain?: boolean | null
          is_verified?: boolean | null
          mx_records?: Json | null
          provider?: string
          updated_at?: string
          user_id?: string
          webhook_secret?: string | null
        }
        Relationships: []
      }
      email_funnels: {
        Row: {
          avg_interval_hours: number | null
          color: string | null
          created_at: string
          description: string | null
          email_ids: string[] | null
          first_email_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          last_email_at: string | null
          name: string
          sender_email: string
          sender_name: string | null
          tags: string[] | null
          total_emails: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_interval_hours?: number | null
          color?: string | null
          created_at?: string
          description?: string | null
          email_ids?: string[] | null
          first_email_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          last_email_at?: string | null
          name: string
          sender_email: string
          sender_name?: string | null
          tags?: string[] | null
          total_emails?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_interval_hours?: number | null
          color?: string | null
          created_at?: string
          description?: string | null
          email_ids?: string[] | null
          first_email_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          last_email_at?: string | null
          name?: string
          sender_email?: string
          sender_name?: string | null
          tags?: string[] | null
          total_emails?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          alias: string | null
          domain: string | null
          error_message: string | null
          from_email: string | null
          from_name: string | null
          id: string
          metadata: Json | null
          newsletter_id: string | null
          processing_time_ms: number | null
          received_at: string | null
          status: string | null
          subject: string | null
        }
        Insert: {
          alias?: string | null
          domain?: string | null
          error_message?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          metadata?: Json | null
          newsletter_id?: string | null
          processing_time_ms?: number | null
          received_at?: string | null
          status?: string | null
          subject?: string | null
        }
        Update: {
          alias?: string | null
          domain?: string | null
          error_message?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          metadata?: Json | null
          newsletter_id?: string | null
          processing_time_ms?: number | null
          received_at?: string | null
          status?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_newsletter_id_fkey"
            columns: ["newsletter_id"]
            isOneToOne: false
            referencedRelation: "captured_newsletters"
            referencedColumns: ["id"]
          },
        ]
      }
      email_seeds: {
        Row: {
          created_at: string
          email: string
          encrypted_password: string | null
          id: string
          imap_host: string | null
          imap_port: number | null
          is_active: boolean | null
          last_sync_at: string | null
          name: string
          provider: string
          updated_at: string
          use_ssl: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          encrypted_password?: string | null
          id?: string
          imap_host?: string | null
          imap_port?: number | null
          is_active?: boolean | null
          last_sync_at?: string | null
          name: string
          provider: string
          updated_at?: string
          use_ssl?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          encrypted_password?: string | null
          id?: string
          imap_host?: string | null
          imap_port?: number | null
          is_active?: boolean | null
          last_sync_at?: string | null
          name?: string
          provider?: string
          updated_at?: string
          use_ssl?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      plan_change_history: {
        Row: {
          change_type: string
          changed_by: string | null
          created_at: string
          from_plan_id: string | null
          from_price: number | null
          id: string
          reason: string | null
          subscription_id: string | null
          to_plan_id: string | null
          to_price: number | null
          user_id: string
        }
        Insert: {
          change_type?: string
          changed_by?: string | null
          created_at?: string
          from_plan_id?: string | null
          from_price?: number | null
          id?: string
          reason?: string | null
          subscription_id?: string | null
          to_plan_id?: string | null
          to_price?: number | null
          user_id: string
        }
        Update: {
          change_type?: string
          changed_by?: string | null
          created_at?: string
          from_plan_id?: string | null
          from_price?: number | null
          id?: string
          reason?: string | null
          subscription_id?: string | null
          to_plan_id?: string | null
          to_price?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_change_history_from_plan_id_fkey"
            columns: ["from_plan_id"]
            isOneToOne: false
            referencedRelation: "saas_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_change_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "saas_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_change_history_to_plan_id_fkey"
            columns: ["to_plan_id"]
            isOneToOne: false
            referencedRelation: "saas_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ai_credits: number | null
          avatar_url: string | null
          created_at: string
          full_name: string | null
          gpt_api_key: string | null
          id: string
          updated_at: string
          use_own_gpt: boolean | null
          user_id: string
        }
        Insert: {
          ai_credits?: number | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          gpt_api_key?: string | null
          id?: string
          updated_at?: string
          use_own_gpt?: boolean | null
          user_id: string
        }
        Update: {
          ai_credits?: number | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          gpt_api_key?: string | null
          id?: string
          updated_at?: string
          use_own_gpt?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          content_json: Json | null
          created_at: string
          description: string | null
          email_sent_at: string | null
          file_url: string | null
          format: string | null
          id: string
          is_scheduled: boolean | null
          period_end: string
          period_start: string
          schedule_frequency: string | null
          send_email: boolean | null
          status: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content_json?: Json | null
          created_at?: string
          description?: string | null
          email_sent_at?: string | null
          file_url?: string | null
          format?: string | null
          id?: string
          is_scheduled?: boolean | null
          period_end: string
          period_start: string
          schedule_frequency?: string | null
          send_email?: boolean | null
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content_json?: Json | null
          created_at?: string
          description?: string | null
          email_sent_at?: string | null
          file_url?: string | null
          format?: string | null
          id?: string
          is_scheduled?: boolean | null
          period_end?: string
          period_start?: string
          schedule_frequency?: string | null
          send_email?: boolean | null
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saas_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          external_id: string | null
          id: string
          metadata: Json | null
          paid_at: string | null
          payment_method: string | null
          payment_provider: string | null
          status: string
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          status?: string
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          status?: string
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "saas_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_plans: {
        Row: {
          created_at: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          max_aliases: number | null
          max_seeds: number | null
          name: string
          price_monthly: number
          price_yearly: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          max_aliases?: number | null
          max_seeds?: number | null
          name: string
          price_monthly?: number
          price_yearly?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          max_aliases?: number | null
          max_seeds?: number | null
          name?: string
          price_monthly?: number
          price_yearly?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      saas_subscriptions: {
        Row: {
          billing_cycle: string | null
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string
          id: string
          plan_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle?: string | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          id?: string
          plan_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle?: string | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          id?: string
          plan_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "saas_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "adminsaas" | "admin" | "user"
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
      app_role: ["adminsaas", "admin", "user"],
    },
  },
} as const
