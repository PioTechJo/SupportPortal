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
      ai_chat_messages: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          sender: string | null
          session_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          sender?: string | null
          session_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          sender?: string | null
          session_id?: string | null
        }
        Relationships: []
      }
      ai_diagnostic_categories: {
        Row: {
          category_name: string | null
          display_order: number | null
          id: string
          product_id: string | null
        }
        Insert: {
          category_name?: string | null
          display_order?: number | null
          id?: string
          product_id?: string | null
        }
        Update: {
          category_name?: string | null
          display_order?: number | null
          id?: string
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_diagnostic_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ai_products"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_diagnostic_questions: {
        Row: {
          category_id: string | null
          display_order: number | null
          id: string
          question_text: string | null
          question_type: string | null
          variable_name: string | null
        }
        Insert: {
          category_id?: string | null
          display_order?: number | null
          id?: string
          question_text?: string | null
          question_type?: string | null
          variable_name?: string | null
        }
        Update: {
          category_id?: string | null
          display_order?: number | null
          id?: string
          question_text?: string | null
          question_type?: string | null
          variable_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_diagnostic_questions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ai_diagnostic_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_knowledge_articles: {
        Row: {
          article_title: string | null
          created_at: string | null
          id: string
          keywords: string | null
          product_code: string | null
          resolution: string | null
          root_cause: string | null
          symptoms: string | null
        }
        Insert: {
          article_title?: string | null
          created_at?: string | null
          id?: string
          keywords?: string | null
          product_code?: string | null
          resolution?: string | null
          root_cause?: string | null
          symptoms?: string | null
        }
        Update: {
          article_title?: string | null
          created_at?: string | null
          id?: string
          keywords?: string | null
          product_code?: string | null
          resolution?: string | null
          root_cause?: string | null
          symptoms?: string | null
        }
        Relationships: []
      }
      ai_products: {
        Row: {
          id: string
          product_code: string | null
          product_name: string | null
        }
        Insert: {
          id?: string
          product_code?: string | null
          product_name?: string | null
        }
        Update: {
          id?: string
          product_code?: string | null
          product_name?: string | null
        }
        Relationships: []
      }
      ai_question_options: {
        Row: {
          display_order: number | null
          id: string
          option_label: string | null
          option_value: string | null
          question_id: string | null
        }
        Insert: {
          display_order?: number | null
          id?: string
          option_label?: string | null
          option_value?: string | null
          question_id?: string | null
        }
        Update: {
          display_order?: number | null
          id?: string
          option_label?: string | null
          option_value?: string | null
          question_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "ai_diagnostic_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_question_templates: {
        Row: {
          component_name: string | null
          created_at: string | null
          id: string
          is_required: boolean | null
          product_code: string
          question_order: number
          question_text: string
          symptom_name: string | null
        }
        Insert: {
          component_name?: string | null
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          product_code: string
          question_order: number
          question_text: string
          symptom_name?: string | null
        }
        Update: {
          component_name?: string | null
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          product_code?: string
          question_order?: number
          question_text?: string
          symptom_name?: string | null
        }
        Relationships: []
      }
      ai_recommendations: {
        Row: {
          component_name: string | null
          confidence_score: number | null
          created_at: string | null
          id: string
          product_code: string | null
          recommendation_text: string
          symptom_name: string | null
          ticket_id: string
        }
        Insert: {
          component_name?: string | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          product_code?: string | null
          recommendation_text: string
          symptom_name?: string | null
          ticket_id: string
        }
        Update: {
          component_name?: string | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          product_code?: string | null
          recommendation_text?: string
          symptom_name?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_recommendations_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_symptoms: {
        Row: {
          active: boolean | null
          component_name: string | null
          created_at: string | null
          id: string
          product_code: string | null
          symptom_name: string | null
        }
        Insert: {
          active?: boolean | null
          component_name?: string | null
          created_at?: string | null
          id?: string
          product_code?: string | null
          symptom_name?: string | null
        }
        Update: {
          active?: boolean | null
          component_name?: string | null
          created_at?: string | null
          id?: string
          product_code?: string | null
          symptom_name?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action_type: string | null
          changed_at: string | null
          changed_by: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          record_id: string | null
          table_name: string | null
        }
        Insert: {
          action_type?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          record_id?: string | null
          table_name?: string | null
        }
        Update: {
          action_type?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          record_id?: string | null
          table_name?: string | null
        }
        Relationships: []
      }
      customer_contacts: {
        Row: {
          created_at: string | null
          customer_id: string
          email: string | null
          full_name: string
          id: string
          is_primary: boolean | null
          job_title: string | null
          mobile: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          email?: string | null
          full_name: string
          id?: string
          is_primary?: boolean | null
          job_title?: string | null
          mobile?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          email?: string | null
          full_name?: string
          id?: string
          is_primary?: boolean | null
          job_title?: string | null
          mobile?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_products: {
        Row: {
          active: boolean | null
          created_at: string | null
          customer_id: string
          id: string
          product_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          customer_id: string
          id?: string
          product_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          customer_id?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_products_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string | null
          customer_code: string
          customer_name: string
          id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_code: string
          customer_name: string
          id?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_code?: string
          customer_name?: string
          id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      knowledge_articles: {
        Row: {
          created_at: string | null
          id: string
          keywords: string | null
          product_code: string
          resolution: string | null
          root_cause: string | null
          symptoms: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          keywords?: string | null
          product_code: string
          resolution?: string | null
          root_cause?: string | null
          symptoms?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          keywords?: string | null
          product_code?: string
          resolution?: string | null
          root_cause?: string | null
          symptoms?: string | null
          title?: string
        }
        Relationships: []
      }
      organization_products: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          organization_id: string
          product_code: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          organization_id: string
          product_code: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string
          product_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      priorities: {
        Row: {
          id: string
          priority_code: string
          priority_name: string
          sort_order: number
        }
        Insert: {
          id?: string
          priority_code: string
          priority_name: string
          sort_order: number
        }
        Update: {
          id?: string
          priority_code?: string
          priority_name?: string
          sort_order?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          product_code: string
          product_name: string
          team_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          product_code: string
          product_name: string
          team_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          product_code?: string
          product_name?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          role_code: string
          role_name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          role_code: string
          role_name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          role_code?: string
          role_name?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string | null
          id: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_users_full"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          team_code: string
          team_name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          team_code: string
          team_name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          team_code?: string
          team_name?: string
        }
        Relationships: []
      }
      ticket_attachments: {
        Row: {
          file_name: string | null
          file_path: string | null
          id: string
          ticket_id: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          file_name?: string | null
          file_path?: string | null
          id?: string
          ticket_id: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          file_name?: string | null
          file_path?: string | null
          id?: string
          ticket_id?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "vw_users_full"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_comments: {
        Row: {
          comment_by: string
          comment_text: string
          comment_type: string
          created_at: string | null
          id: string
          ticket_id: string
        }
        Insert: {
          comment_by: string
          comment_text: string
          comment_type: string
          created_at?: string | null
          id?: string
          ticket_id: string
        }
        Update: {
          comment_by?: string
          comment_text?: string
          comment_type?: string
          created_at?: string | null
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_comment_by_fkey"
            columns: ["comment_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_comments_comment_by_fkey"
            columns: ["comment_by"]
            isOneToOne: false
            referencedRelation: "vw_users_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_internal_notes: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          note_text: string
          ticket_id: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          note_text: string
          ticket_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          note_text?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_internal_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_internal_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_users_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_internal_notes_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_status_history: {
        Row: {
          change_notes: string | null
          changed_at: string | null
          changed_by: string | null
          id: string
          new_status_id: string | null
          old_status_id: string | null
          ticket_id: string
        }
        Insert: {
          change_notes?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status_id?: string | null
          old_status_id?: string | null
          ticket_id: string
        }
        Update: {
          change_notes?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status_id?: string | null
          old_status_id?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "vw_users_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_status_history_new_status_id_fkey"
            columns: ["new_status_id"]
            isOneToOne: false
            referencedRelation: "ticket_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_status_history_old_status_id_fkey"
            columns: ["old_status_id"]
            isOneToOne: false
            referencedRelation: "ticket_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_status_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_statuses: {
        Row: {
          created_at: string | null
          id: string
          sort_order: number
          status_code: string
          status_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          sort_order: number
          status_code: string
          status_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          sort_order?: number
          status_code?: string
          status_name?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          ai_confidence: number | null
          ai_recommendation: string | null
          ai_root_cause: string | null
          ai_summary: string | null
          assigned_team_id: string | null
          assigned_user_id: string | null
          business_impact: string | null
          created_at: string | null
          created_by: string
          customer_id: string
          description: string
          environment: string | null
          id: string
          priority_id: string
          product_id: string
          status_id: string
          subject: string
          ticket_no: string
          updated_at: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_recommendation?: string | null
          ai_root_cause?: string | null
          ai_summary?: string | null
          assigned_team_id?: string | null
          assigned_user_id?: string | null
          business_impact?: string | null
          created_at?: string | null
          created_by: string
          customer_id: string
          description: string
          environment?: string | null
          id?: string
          priority_id: string
          product_id: string
          status_id: string
          subject: string
          ticket_no: string
          updated_at?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_recommendation?: string | null
          ai_root_cause?: string | null
          ai_summary?: string | null
          assigned_team_id?: string | null
          assigned_user_id?: string | null
          business_impact?: string | null
          created_at?: string | null
          created_by?: string
          customer_id?: string
          description?: string
          environment?: string | null
          id?: string
          priority_id?: string
          product_id?: string
          status_id?: string
          subject?: string
          ticket_no?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_team_id_fkey"
            columns: ["assigned_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "vw_users_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_users_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_priority_id_fkey"
            columns: ["priority_id"]
            isOneToOne: false
            referencedRelation: "priorities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "ticket_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          active: boolean | null
          created_at: string | null
          customer_id: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          last_activity: string | null
          last_login: string | null
          role_id: string | null
          team_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          customer_id?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          last_activity?: string | null
          last_login?: string | null
          role_id?: string | null
          team_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          customer_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_activity?: string | null
          last_login?: string | null
          role_id?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vw_users_full: {
        Row: {
          active: boolean | null
          customer_code: string | null
          customer_name: string | null
          email: string | null
          full_name: string | null
          id: string | null
          role_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      auth_user_customer_id: { Args: never; Returns: string }
      current_customer_id: { Args: never; Returns: string }
      generate_ticket_no: { Args: never; Returns: string }
      is_internal_role: { Args: { r_id: string }; Returns: boolean }
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
