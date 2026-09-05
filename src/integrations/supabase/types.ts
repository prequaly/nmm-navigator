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
      action_items: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          due_date: string | null
          effort_hours: number | null
          id: string
          notes: string | null
          okr_id: string | null
          organization_id: string
          owner_label: string | null
          owner_user_id: string | null
          percent_complete: number
          pillar_id: string | null
          plan_id: string | null
          priority: Database["public"]["Enums"]["action_priority"]
          roadmap_item_id: string | null
          sort_order: number
          start_date: string | null
          status: Database["public"]["Enums"]["action_status"]
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          effort_hours?: number | null
          id?: string
          notes?: string | null
          okr_id?: string | null
          organization_id: string
          owner_label?: string | null
          owner_user_id?: string | null
          percent_complete?: number
          pillar_id?: string | null
          plan_id?: string | null
          priority?: Database["public"]["Enums"]["action_priority"]
          roadmap_item_id?: string | null
          sort_order?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["action_status"]
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          effort_hours?: number | null
          id?: string
          notes?: string | null
          okr_id?: string | null
          organization_id?: string
          owner_label?: string | null
          owner_user_id?: string | null
          percent_complete?: number
          pillar_id?: string | null
          plan_id?: string | null
          priority?: Database["public"]["Enums"]["action_priority"]
          roadmap_item_id?: string | null
          sort_order?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["action_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_items_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_okr_id_fkey"
            columns: ["okr_id"]
            isOneToOne: false
            referencedRelation: "okrs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_pillar_id_fkey"
            columns: ["pillar_id"]
            isOneToOne: false
            referencedRelation: "strategic_pillars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "strategic_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_roadmap_item_id_fkey"
            columns: ["roadmap_item_id"]
            isOneToOne: false
            referencedRelation: "roadmap_items"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_responses: {
        Row: {
          assessment_type: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          maturity_level: string | null
          notes: string | null
          organization_id: string
          plan_id: string
          reflection: string | null
          responses: Json
          score: number | null
          updated_at: string
        }
        Insert: {
          assessment_type: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          maturity_level?: string | null
          notes?: string | null
          organization_id: string
          plan_id: string
          reflection?: string | null
          responses?: Json
          score?: number | null
          updated_at?: string
        }
        Update: {
          assessment_type?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          maturity_level?: string | null
          notes?: string | null
          organization_id?: string
          plan_id?: string
          reflection?: string | null
          responses?: Json
          score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_responses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_responses_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "strategic_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      board_members: {
        Row: {
          age_range: string | null
          committees: string[]
          created_at: string
          created_by: string | null
          gender: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          race: string | null
          role: string
          skills: string[]
          term_end: number | null
          term_start: number | null
          updated_at: string
        }
        Insert: {
          age_range?: string | null
          committees?: string[]
          created_at?: string
          created_by?: string | null
          gender?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          race?: string | null
          role?: string
          skills?: string[]
          term_end?: number | null
          term_start?: number | null
          updated_at?: string
        }
        Update: {
          age_range?: string | null
          committees?: string[]
          created_at?: string
          created_by?: string | null
          gender?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          race?: string | null
          role?: string
          skills?: string[]
          term_end?: number | null
          term_start?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_projections: {
        Row: {
          category: string
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          period_end: string
          period_start: string
          period_type: Database["public"]["Enums"]["projection_period"]
          plan_id: string | null
          probability_weighted: boolean
          projected_amount: number
          source: Database["public"]["Enums"]["projection_source"]
          source_id: string | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          period_end: string
          period_start: string
          period_type?: Database["public"]["Enums"]["projection_period"]
          plan_id?: string | null
          probability_weighted?: boolean
          projected_amount?: number
          source?: Database["public"]["Enums"]["projection_source"]
          source_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          period_end?: string
          period_start?: string
          period_type?: Database["public"]["Enums"]["projection_period"]
          plan_id?: string | null
          probability_weighted?: boolean
          projected_amount?: number
          source?: Database["public"]["Enums"]["projection_source"]
          source_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_projections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_projections_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "strategic_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      coffee_chats: {
        Row: {
          chat_date: string
          contact_name: string
          contact_org: string | null
          contact_type: string
          created_at: string
          created_by: string | null
          follow_up_date: string | null
          id: string
          next_step: string | null
          notes: string | null
          organization_id: string
          outcome: string | null
          updated_at: string
        }
        Insert: {
          chat_date?: string
          contact_name: string
          contact_org?: string | null
          contact_type?: string
          created_at?: string
          created_by?: string | null
          follow_up_date?: string | null
          id?: string
          next_step?: string | null
          notes?: string | null
          organization_id: string
          outcome?: string | null
          updated_at?: string
        }
        Update: {
          chat_date?: string
          contact_name?: string
          contact_org?: string | null
          contact_type?: string
          created_at?: string
          created_by?: string | null
          follow_up_date?: string | null
          id?: string
          next_step?: string | null
          notes?: string | null
          organization_id?: string
          outcome?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coffee_chats_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          edited_at: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["comment_entity_type"]
          id: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          edited_at?: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["comment_entity_type"]
          id?: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          edited_at?: string | null
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["comment_entity_type"]
          id?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          lead_user_id: string | null
          meeting_day_of_week: number | null
          meeting_time: string | null
          name: string
          organization_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lead_user_id?: string | null
          meeting_day_of_week?: number | null
          meeting_time?: string | null
          name: string
          organization_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lead_user_id?: string | null
          meeting_day_of_week?: number | null
          meeting_time?: string | null
          name?: string
          organization_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_lines: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          notes: string | null
          organization_id: string
          plan_id: string | null
          program_name: string | null
          sort_order: number
          updated_at: string
          yearly_amounts: Json
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          plan_id?: string | null
          program_name?: string | null
          sort_order?: number
          updated_at?: string
          yearly_amounts?: Json
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          plan_id?: string | null
          program_name?: string | null
          sort_order?: number
          updated_at?: string
          yearly_amounts?: Json
        }
        Relationships: [
          {
            foreignKeyName: "expense_lines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_lines_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "strategic_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_assumptions: {
        Row: {
          base_year: number
          created_at: string
          current_reserve_balance: number
          fte_loaded_cost: number
          id: string
          inflation_rate: number
          notes: string | null
          organization_id: string
          plan_id: string
          reserve_target_months: number
          revenue_growth_rate: number
          updated_at: string
        }
        Insert: {
          base_year: number
          created_at?: string
          current_reserve_balance?: number
          fte_loaded_cost?: number
          id?: string
          inflation_rate?: number
          notes?: string | null
          organization_id: string
          plan_id: string
          reserve_target_months?: number
          revenue_growth_rate?: number
          updated_at?: string
        }
        Update: {
          base_year?: number
          created_at?: string
          current_reserve_balance?: number
          fte_loaded_cost?: number
          id?: string
          inflation_rate?: number
          notes?: string | null
          organization_id?: string
          plan_id?: string
          reserve_target_months?: number
          revenue_growth_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_assumptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_assumptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: true
            referencedRelation: "strategic_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      grant_payments: {
        Row: {
          amount: number
          created_at: string
          grant_id: string
          id: string
          notes: string | null
          organization_id: string
          received_amount: number | null
          received_date: string | null
          scheduled_date: string
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          grant_id: string
          id?: string
          notes?: string | null
          organization_id: string
          received_amount?: number | null
          received_date?: string | null
          scheduled_date: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          grant_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          received_amount?: number | null
          received_date?: string | null
          scheduled_date?: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grant_payments_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grant_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      grant_responses: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          question_id: string
          updated_at: string
          variant: string
        }
        Insert: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          question_id: string
          updated_at?: string
          variant: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          question_id?: string
          updated_at?: string
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "grant_responses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      grants: {
        Row: {
          amount_awarded: number | null
          amount_requested: number | null
          application_deadline: string | null
          contact_email: string | null
          contact_name: string | null
          created_at: string
          created_by: string | null
          decision_date: string | null
          end_date: string | null
          fiscal_year_start: string | null
          funder_name: string
          grant_name: string
          grant_type: Database["public"]["Enums"]["grant_type"]
          id: string
          notes: string | null
          organization_id: string
          plan_id: string | null
          probability: number
          program_area: string | null
          reporting_requirements: string | null
          restriction: Database["public"]["Enums"]["grant_restriction"]
          start_date: string | null
          status: Database["public"]["Enums"]["grant_status"]
          updated_at: string
        }
        Insert: {
          amount_awarded?: number | null
          amount_requested?: number | null
          application_deadline?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          decision_date?: string | null
          end_date?: string | null
          fiscal_year_start?: string | null
          funder_name: string
          grant_name: string
          grant_type?: Database["public"]["Enums"]["grant_type"]
          id?: string
          notes?: string | null
          organization_id: string
          plan_id?: string | null
          probability?: number
          program_area?: string | null
          reporting_requirements?: string | null
          restriction?: Database["public"]["Enums"]["grant_restriction"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["grant_status"]
          updated_at?: string
        }
        Update: {
          amount_awarded?: number | null
          amount_requested?: number | null
          application_deadline?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          decision_date?: string | null
          end_date?: string | null
          fiscal_year_start?: string | null
          funder_name?: string
          grant_name?: string
          grant_type?: Database["public"]["Enums"]["grant_type"]
          id?: string
          notes?: string | null
          organization_id?: string
          plan_id?: string | null
          probability?: number
          program_area?: string | null
          reporting_requirements?: string | null
          restriction?: Database["public"]["Enums"]["grant_restriction"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["grant_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grants_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "strategic_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      kpis: {
        Row: {
          baseline: number | null
          category: string | null
          created_at: string
          current_value: number | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          pillar_id: string | null
          plan_id: string
          target: number | null
          target_year: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          baseline?: number | null
          category?: string | null
          created_at?: string
          current_value?: number | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          pillar_id?: string | null
          plan_id: string
          target?: number | null
          target_year?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          baseline?: number | null
          category?: string | null
          created_at?: string
          current_value?: number | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          pillar_id?: string | null
          plan_id?: string
          target?: number | null
          target_year?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpis_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpis_pillar_id_fkey"
            columns: ["pillar_id"]
            isOneToOne: false
            referencedRelation: "strategic_pillars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpis_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "strategic_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_action_items: {
        Row: {
          action_item_id: string
          commitment_due_date: string | null
          commitment_owner_user_id: string | null
          context: string | null
          created_at: string
          id: string
          meeting_id: string
          organization_id: string
        }
        Insert: {
          action_item_id: string
          commitment_due_date?: string | null
          commitment_owner_user_id?: string | null
          context?: string | null
          created_at?: string
          id?: string
          meeting_id: string
          organization_id: string
        }
        Update: {
          action_item_id?: string
          commitment_due_date?: string | null
          commitment_owner_user_id?: string | null
          context?: string | null
          created_at?: string
          id?: string
          meeting_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_action_items_action_item_id_fkey"
            columns: ["action_item_id"]
            isOneToOne: false
            referencedRelation: "action_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_agenda_items: {
        Row: {
          auto_generated: boolean
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          meeting_id: string
          organization_id: string
          presenter_user_id: string | null
          sort_order: number
          source_id: string | null
          source_kind: string | null
          title: string
          updated_at: string
        }
        Insert: {
          auto_generated?: boolean
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_id: string
          organization_id: string
          presenter_user_id?: string | null
          sort_order?: number
          source_id?: string | null
          source_kind?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          auto_generated?: boolean
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_id?: string
          organization_id?: string
          presenter_user_id?: string | null
          sort_order?: number
          source_id?: string | null
          source_kind?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_agenda_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_agenda_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_attendees: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          meeting_id: string
          organization_id: string
          role: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          meeting_id: string
          organization_id: string
          role?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          meeting_id?: string
          organization_id?: string
          role?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendees_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_decisions: {
        Row: {
          agenda_item_id: string | null
          created_at: string
          created_by: string | null
          decided_at: string
          decided_by: string | null
          follow_up: string | null
          id: string
          impact: string | null
          meeting_id: string | null
          organization_id: string
          rationale: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agenda_item_id?: string | null
          created_at?: string
          created_by?: string | null
          decided_at?: string
          decided_by?: string | null
          follow_up?: string | null
          id?: string
          impact?: string | null
          meeting_id?: string | null
          organization_id: string
          rationale?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agenda_item_id?: string | null
          created_at?: string
          created_by?: string | null
          decided_at?: string
          decided_by?: string | null
          follow_up?: string | null
          id?: string
          impact?: string | null
          meeting_id?: string | null
          organization_id?: string
          rationale?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_decisions_agenda_item_id_fkey"
            columns: ["agenda_item_id"]
            isOneToOne: false
            referencedRelation: "meeting_agenda_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_decisions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_decisions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_minutes: {
        Row: {
          agenda_item_id: string | null
          author_user_id: string | null
          body: string
          created_at: string
          id: string
          meeting_id: string
          organization_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          agenda_item_id?: string | null
          author_user_id?: string | null
          body: string
          created_at?: string
          id?: string
          meeting_id: string
          organization_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          agenda_item_id?: string | null
          author_user_id?: string | null
          body?: string
          created_at?: string
          id?: string
          meeting_id?: string
          organization_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_minutes_agenda_item_id_fkey"
            columns: ["agenda_item_id"]
            isOneToOne: false
            referencedRelation: "meeting_agenda_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_minutes_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_minutes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          cadence: Database["public"]["Enums"]["meeting_cadence"]
          created_at: string
          created_by: string | null
          department_id: string | null
          duration_minutes: number
          facilitator_user_id: string | null
          id: string
          location: string | null
          organization_id: string
          plan_id: string | null
          scheduled_at: string
          scribe_user_id: string | null
          status: Database["public"]["Enums"]["meeting_status"]
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          cadence: Database["public"]["Enums"]["meeting_cadence"]
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          duration_minutes?: number
          facilitator_user_id?: string | null
          id?: string
          location?: string | null
          organization_id: string
          plan_id?: string | null
          scheduled_at: string
          scribe_user_id?: string | null
          status?: Database["public"]["Enums"]["meeting_status"]
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          cadence?: Database["public"]["Enums"]["meeting_cadence"]
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          duration_minutes?: number
          facilitator_user_id?: string | null
          id?: string
          location?: string | null
          organization_id?: string
          plan_id?: string | null
          scheduled_at?: string
          scribe_user_id?: string | null
          status?: Database["public"]["Enums"]["meeting_status"]
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "strategic_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      okrs: {
        Row: {
          created_at: string
          id: string
          key_results: Json
          objective: string
          organization_id: string
          owner: string | null
          pillar_id: string | null
          plan_id: string
          progress: number
          quarter: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_results?: Json
          objective: string
          organization_id: string
          owner?: string | null
          pillar_id?: string | null
          plan_id: string
          progress?: number
          quarter?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          key_results?: Json
          objective?: string
          organization_id?: string
          owner?: string | null
          pillar_id?: string | null
          plan_id?: string
          progress?: number
          quarter?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "okrs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okrs_pillar_id_fkey"
            columns: ["pillar_id"]
            isOneToOne: false
            referencedRelation: "strategic_pillars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okrs_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "strategic_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["invite_status"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          annual_budget: number | null
          beneficiaries: string | null
          created_at: string
          created_by: string | null
          ein: string | null
          fiscal_sponsor_name: string | null
          geographic_area: string | null
          id: string
          long_term_goals: string | null
          mission: string | null
          name: string
          onboarded_at: string | null
          stage: string | null
          staff_count: number | null
          tax_status: string | null
          updated_at: string
          values: string | null
          vision: string | null
          volunteer_count: number | null
          year_founded: number | null
        }
        Insert: {
          annual_budget?: number | null
          beneficiaries?: string | null
          created_at?: string
          created_by?: string | null
          ein?: string | null
          fiscal_sponsor_name?: string | null
          geographic_area?: string | null
          id?: string
          long_term_goals?: string | null
          mission?: string | null
          name: string
          onboarded_at?: string | null
          stage?: string | null
          staff_count?: number | null
          tax_status?: string | null
          updated_at?: string
          values?: string | null
          vision?: string | null
          volunteer_count?: number | null
          year_founded?: number | null
        }
        Update: {
          annual_budget?: number | null
          beneficiaries?: string | null
          created_at?: string
          created_by?: string | null
          ein?: string | null
          fiscal_sponsor_name?: string | null
          geographic_area?: string | null
          id?: string
          long_term_goals?: string | null
          mission?: string | null
          name?: string
          onboarded_at?: string | null
          stage?: string | null
          staff_count?: number | null
          tax_status?: string | null
          updated_at?: string
          values?: string | null
          vision?: string | null
          volunteer_count?: number | null
          year_founded?: number | null
        }
        Relationships: []
      }
      plan_exports: {
        Row: {
          created_at: string
          file_url: string | null
          format: string
          generated_by: string | null
          id: string
          organization_id: string
          plan_id: string
          share_token: string | null
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          format: string
          generated_by?: string | null
          id?: string
          organization_id: string
          plan_id: string
          share_token?: string | null
        }
        Update: {
          created_at?: string
          file_url?: string | null
          format?: string
          generated_by?: string | null
          id?: string
          organization_id?: string
          plan_id?: string
          share_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_exports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_exports_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "strategic_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_narratives: {
        Row: {
          ai_drafted_at: string | null
          body: string
          created_at: string
          id: string
          organization_id: string
          section_key: string
          updated_at: string
        }
        Insert: {
          ai_drafted_at?: string | null
          body?: string
          created_at?: string
          id?: string
          organization_id: string
          section_key: string
          updated_at?: string
        }
        Update: {
          ai_drafted_at?: string | null
          body?: string
          created_at?: string
          id?: string
          organization_id?: string
          section_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_narratives_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["platform_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["platform_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["platform_role"]
          user_id?: string
        }
        Relationships: []
      }
      policies: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          category: string
          content: string | null
          created_at: string
          created_by: string | null
          id: string
          next_review_date: string | null
          organization_id: string
          owner: string | null
          status: string
          summary: string | null
          title: string
          updated_at: string
          version: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          next_review_date?: string | null
          organization_id: string
          owner?: string | null
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
          version?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          next_review_date?: string | null
          organization_id?: string
          owner?: string | null
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      revenue_streams: {
        Row: {
          category: string
          confidence: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          organization_id: string
          plan_id: string | null
          sort_order: number
          updated_at: string
          yearly_amounts: Json
        }
        Insert: {
          category: string
          confidence?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          plan_id?: string | null
          sort_order?: number
          updated_at?: string
          yearly_amounts?: Json
        }
        Update: {
          category?: string
          confidence?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          plan_id?: string | null
          sort_order?: number
          updated_at?: string
          yearly_amounts?: Json
        }
        Relationships: [
          {
            foreignKeyName: "revenue_streams_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_streams_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "strategic_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      risks: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          impact: number
          likelihood: number
          mitigation: string | null
          organization_id: string
          owner: string | null
          plan_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          impact: number
          likelihood: number
          mitigation?: string | null
          organization_id: string
          owner?: string | null
          plan_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          impact?: number
          likelihood?: number
          mitigation?: string | null
          organization_id?: string
          owner?: string | null
          plan_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "strategic_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_items: {
        Row: {
          created_at: string
          dependencies: Json
          description: string | null
          end_date: string
          id: string
          organization_id: string
          owner: string | null
          pillar_id: string | null
          plan_id: string
          progress: number
          sort_order: number
          start_date: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dependencies?: Json
          description?: string | null
          end_date: string
          id?: string
          organization_id: string
          owner?: string | null
          pillar_id?: string | null
          plan_id: string
          progress?: number
          sort_order?: number
          start_date: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dependencies?: Json
          description?: string | null
          end_date?: string
          id?: string
          organization_id?: string
          owner?: string | null
          pillar_id?: string | null
          plan_id?: string
          progress?: number
          sort_order?: number
          start_date?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadmap_items_pillar_id_fkey"
            columns: ["pillar_id"]
            isOneToOne: false
            referencedRelation: "strategic_pillars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadmap_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "strategic_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_roles: {
        Row: {
          backup: string | null
          created_at: string
          created_by: string | null
          documented: boolean
          emergency_successor: string | null
          holder: string | null
          id: string
          key_person_risk: string
          notes: string | null
          organization_id: string
          tenure: string | null
          title: string
          updated_at: string
        }
        Insert: {
          backup?: string | null
          created_at?: string
          created_by?: string | null
          documented?: boolean
          emergency_successor?: string | null
          holder?: string | null
          id?: string
          key_person_risk?: string
          notes?: string | null
          organization_id: string
          tenure?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          backup?: string | null
          created_at?: string
          created_by?: string | null
          documented?: boolean
          emergency_successor?: string | null
          holder?: string | null
          id?: string
          key_person_risk?: string
          notes?: string | null
          organization_id?: string
          tenure?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      strategic_pillars: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          fourrs_dimensions: string[]
          id: string
          impact_lenses: string[]
          name: string
          organization_id: string
          owner: string | null
          plan_id: string
          priority_level: string | null
          sort_order: number
          timeline_end: string | null
          timeline_start: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          fourrs_dimensions?: string[]
          id?: string
          impact_lenses?: string[]
          name: string
          organization_id: string
          owner?: string | null
          plan_id: string
          priority_level?: string | null
          sort_order?: number
          timeline_end?: string | null
          timeline_start?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          fourrs_dimensions?: string[]
          id?: string
          impact_lenses?: string[]
          name?: string
          organization_id?: string
          owner?: string | null
          plan_id?: string
          priority_level?: string | null
          sort_order?: number
          timeline_end?: string | null
          timeline_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategic_pillars_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategic_pillars_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "strategic_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      strategic_plans: {
        Row: {
          created_at: string
          created_by: string | null
          executive_summary: string | null
          fiscal_year_start: number
          id: string
          mission_alignment: string | null
          name: string
          organization_id: string
          planning_horizon_years: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          executive_summary?: string | null
          fiscal_year_start?: number
          id?: string
          mission_alignment?: string | null
          name: string
          organization_id: string
          planning_horizon_years?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          executive_summary?: string | null
          fiscal_year_start?: number
          id?: string
          mission_alignment?: string | null
          name?: string
          organization_id?: string
          planning_horizon_years?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategic_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_tasks: {
        Row: {
          action_item_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          organization_id: string
          owner_user_id: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          action_item_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          organization_id: string
          owner_user_id?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          action_item_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          organization_id?: string
          owner_user_id?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_tasks_action_item_id_fkey"
            columns: ["action_item_id"]
            isOneToOne: false
            referencedRelation: "action_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      theory_of_change: {
        Row: {
          activities: Json
          assumptions: Json
          created_at: string
          external_factors: Json
          id: string
          impact: Json
          inputs: Json
          organization_id: string
          outcomes: Json
          outputs: Json
          plan_id: string
          problem_statement: string | null
          updated_at: string
        }
        Insert: {
          activities?: Json
          assumptions?: Json
          created_at?: string
          external_factors?: Json
          id?: string
          impact?: Json
          inputs?: Json
          organization_id: string
          outcomes?: Json
          outputs?: Json
          plan_id: string
          problem_statement?: string | null
          updated_at?: string
        }
        Update: {
          activities?: Json
          assumptions?: Json
          created_at?: string
          external_factors?: Json
          id?: string
          impact?: Json
          inputs?: Json
          organization_id?: string
          outcomes?: Json
          outputs?: Json
          plan_id?: string
          problem_statement?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "theory_of_change_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "theory_of_change_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: true
            referencedRelation: "strategic_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      swot_items: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          plan_id: string
          quadrant: string
          sort_order: number
          text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          plan_id: string
          quadrant: string
          sort_order?: number
          text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          plan_id?: string
          quadrant?: string
          sort_order?: number
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "swot_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swot_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "strategic_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          budget: number | null
          created_at: string
          id: string
          name: string
          organization_id: string
          participants: number | null
          pillar_id: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          budget?: number | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
          participants?: number | null
          pillar_id?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          budget?: number | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          participants?: number | null
          pillar_id?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_pillar_id_fkey"
            columns: ["pillar_id"]
            isOneToOne: false
            referencedRelation: "strategic_pillars"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_items: {
        Row: {
          cadence: string
          category: string
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          organization_id: string
          owner: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          cadence?: string
          category: string
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          owner?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          cadence?: string
          category?: string
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          owner?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      touchpoints: {
        Row: {
          audience: string
          channel: string
          created_at: string
          id: string
          note: string | null
          organization_id: string
          owner: string | null
          scheduled_date: string | null
          segment: string | null
          title: string
          updated_at: string
        }
        Insert: {
          audience: string
          channel: string
          created_at?: string
          id?: string
          note?: string | null
          organization_id: string
          owner?: string | null
          scheduled_date?: string | null
          segment?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          channel?: string
          created_at?: string
          id?: string
          note?: string | null
          organization_id?: string
          owner?: string | null
          scheduled_date?: string | null
          segment?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "touchpoints_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stakeholders: {
        Row: {
          created_at: string
          id: string
          influence: number
          interest: number
          name: string
          organization_id: string
          owner: string | null
          relationship: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          influence: number
          interest: number
          name: string
          organization_id: string
          owner?: string | null
          relationship?: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          influence?: number
          interest?: number
          name?: string
          organization_id?: string
          owner?: string | null
          relationship?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stakeholders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_scenarios: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          organization_id: string
          plan_id: string
          shock_type: string
          shock_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          plan_id: string
          shock_type: string
          shock_value?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          plan_id?: string
          shock_type?: string
          shock_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_scenarios_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_scenarios_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "strategic_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      asks: {
        Row: {
          amount: number
          audience: string | null
          board_language: string | null
          created_at: string
          donor_language: string | null
          grant_language: string | null
          id: string
          organization_id: string
          pillar_id: string | null
          secured_amount: number
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          audience?: string | null
          board_language?: string | null
          created_at?: string
          donor_language?: string | null
          grant_language?: string | null
          id?: string
          organization_id: string
          pillar_id?: string | null
          secured_amount?: number
          status?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          audience?: string | null
          board_language?: string | null
          created_at?: string
          donor_language?: string | null
          grant_language?: string | null
          id?: string
          organization_id?: string
          pillar_id?: string | null
          secured_amount?: number
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asks_pillar_id_fkey"
            columns: ["pillar_id"]
            isOneToOne: false
            referencedRelation: "strategic_pillars"
            referencedColumns: ["id"]
          },
        ]
      }
      impact_stories: {
        Row: {
          age: string | null
          captured_on: string | null
          consent: string
          created_at: string
          id: string
          organization_id: string
          outcome: string | null
          program: string | null
          quote: string | null
          subject_name: string
          tags: string[]
          updated_at: string
          uses: string[]
        }
        Insert: {
          age?: string | null
          captured_on?: string | null
          consent?: string
          created_at?: string
          id?: string
          organization_id: string
          outcome?: string | null
          program?: string | null
          quote?: string | null
          subject_name: string
          tags?: string[]
          updated_at?: string
          uses?: string[]
        }
        Update: {
          age?: string | null
          captured_on?: string | null
          consent?: string
          created_at?: string
          id?: string
          organization_id?: string
          outcome?: string | null
          program?: string | null
          quote?: string | null
          subject_name?: string
          tags?: string[]
          updated_at?: string
          uses?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "impact_stories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      donor_segments: {
        Row: {
          color: string | null
          created_at: string
          donor_count: number
          id: string
          label: string
          organization_id: string
          retention_pct: number | null
          sort_order: number
          total_amount: number
          updated_at: string
          yoy_change_pct: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          donor_count?: number
          id?: string
          label: string
          organization_id: string
          retention_pct?: number | null
          sort_order?: number
          total_amount?: number
          updated_at?: string
          yoy_change_pct?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          donor_count?: number
          id?: string
          label?: string
          organization_id?: string
          retention_pct?: number | null
          sort_order?: number
          total_amount?: number
          updated_at?: string
          yoy_change_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "donor_segments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_org_invite: {
        Args: { _token: string }
        Returns: {
          org_id: string
          org_name: string
          member_role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      has_org_role: {
        Args: {
          _org: string
          _role: Database["public"]["Enums"]["app_role"]
          _user: string
        }
        Returns: boolean
      }
      has_platform_role: {
        Args: {
          _role: Database["public"]["Enums"]["platform_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_admin: { Args: { _org: string; _user: string }; Returns: boolean }
      is_org_editor: { Args: { _org: string; _user: string }; Returns: boolean }
      is_org_member: { Args: { _org: string; _user: string }; Returns: boolean }
      is_org_plan_contributor: {
        Args: { _org: string; _user: string }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
      shares_org_with: { Args: { _user: string }; Returns: boolean }
    }
    Enums: {
      action_priority: "low" | "medium" | "high" | "critical"
      action_status:
        | "not_started"
        | "in_progress"
        | "blocked"
        | "at_risk"
        | "done"
        | "cancelled"
      app_role: "owner" | "admin" | "staff" | "board_member" | "consultant" | "viewer"
      attendance_status: "invited" | "attended" | "absent" | "excused"
      invite_status: "pending" | "accepted" | "revoked" | "expired"
      comment_entity_type: "pillar" | "kpi" | "risk"
      grant_restriction:
        | "unrestricted"
        | "temporarily_restricted"
        | "permanently_restricted"
      grant_status:
        | "prospect"
        | "applied"
        | "pending"
        | "awarded"
        | "declined"
        | "active"
        | "closed"
      grant_type:
        | "general_operating"
        | "program"
        | "capital"
        | "capacity_building"
        | "multi_year"
        | "in_kind"
        | "other"
      meeting_cadence: "quarterly" | "monthly" | "weekly" | "adhoc"
      meeting_status: "scheduled" | "in_progress" | "completed" | "cancelled"
      payment_status:
        | "scheduled"
        | "invoiced"
        | "received"
        | "late"
        | "cancelled"
      platform_role: "super_admin"
      projection_period: "monthly" | "quarterly" | "annual"
      projection_source: "grant" | "revenue_stream" | "expense_line" | "manual"
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
      action_priority: ["low", "medium", "high", "critical"],
      action_status: [
        "not_started",
        "in_progress",
        "blocked",
        "at_risk",
        "done",
        "cancelled",
      ],
      app_role: ["owner", "admin", "staff", "board_member", "consultant", "viewer"],
      attendance_status: ["invited", "attended", "absent", "excused"],
      invite_status: ["pending", "accepted", "revoked", "expired"],
      comment_entity_type: ["pillar", "kpi", "risk"],
      grant_restriction: [
        "unrestricted",
        "temporarily_restricted",
        "permanently_restricted",
      ],
      grant_status: [
        "prospect",
        "applied",
        "pending",
        "awarded",
        "declined",
        "active",
        "closed",
      ],
      grant_type: [
        "general_operating",
        "program",
        "capital",
        "capacity_building",
        "multi_year",
        "in_kind",
        "other",
      ],
      meeting_cadence: ["quarterly", "monthly", "weekly", "adhoc"],
      meeting_status: ["scheduled", "in_progress", "completed", "cancelled"],
      payment_status: [
        "scheduled",
        "invoiced",
        "received",
        "late",
        "cancelled",
      ],
      platform_role: ["super_admin"],
      projection_period: ["monthly", "quarterly", "annual"],
      projection_source: ["grant", "revenue_stream", "expense_line", "manual"],
    },
  },
} as const
