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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          created_at: string
          deleted_at: string | null
          display_name: string
          id: string
          metadata: Json | null
          name: string
          organization_id: string
          status: Database["public"]["Enums"]["APPLICATION_STATUS"]
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          display_name: string
          id: string
          metadata?: Json | null
          name: string
          organization_id: string
          status?: Database["public"]["Enums"]["APPLICATION_STATUS"]
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          id?: string
          metadata?: Json | null
          name?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["APPLICATION_STATUS"]
        }
        Relationships: [
          {
            foreignKeyName: "applications_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      builds: {
        Row: {
          build_context: Json | null
          build_end: string | null
          build_id: string | null
          build_log: Json | null
          build_start: string | null
          build_status: Database["public"]["Enums"]["BUILD_STATUS"] | null
          created_at: string
          deleted_at: string | null
          environment_id: string
          id: string
          service_id: string
          updated_at: string | null
        }
        Insert: {
          build_context?: Json | null
          build_end?: string | null
          build_id?: string | null
          build_log?: Json | null
          build_start?: string | null
          build_status?: Database["public"]["Enums"]["BUILD_STATUS"] | null
          created_at?: string
          deleted_at?: string | null
          environment_id: string
          id?: string
          service_id: string
          updated_at?: string | null
        }
        Update: {
          build_context?: Json | null
          build_end?: string | null
          build_id?: string | null
          build_log?: Json | null
          build_start?: string | null
          build_status?: Database["public"]["Enums"]["BUILD_STATUS"] | null
          created_at?: string
          deleted_at?: string | null
          environment_id?: string
          id?: string
          service_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "builds_environment_id_environments_id_fk"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builds_service_id_services_id_fk"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          organization_id: string
          polar_customer_id: string
          user_id: string
        }
        Insert: {
          organization_id: string
          polar_customer_id: string
          user_id: string
        }
        Update: {
          organization_id?: string
          polar_customer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      destroys: {
        Row: {
          created_at: string
          deleted_at: string | null
          destroy_context: Json | null
          destroy_id: string | null
          destroy_status: Database["public"]["Enums"]["BUILD_STATUS"] | null
          environment_id: string
          id: string
          service_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          destroy_context?: Json | null
          destroy_id?: string | null
          destroy_status?: Database["public"]["Enums"]["BUILD_STATUS"] | null
          environment_id: string
          id?: string
          service_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          destroy_context?: Json | null
          destroy_id?: string | null
          destroy_status?: Database["public"]["Enums"]["BUILD_STATUS"] | null
          environment_id?: string
          id?: string
          service_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "destroys_environment_id_environments_id_fk"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "destroys_service_id_services_id_fk"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      domains: {
        Row: {
          created_at: string
          deleted_at: string | null
          domain: string
          global_certificate_arn: string | null
          hosted_zone_id: string | null
          id: string
          regional_certificate_arn: string | null
          service_id: string
          updated_at: string | null
          verification_meta: Json | null
          verification_method: string | null
          verified: boolean
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          domain: string
          global_certificate_arn?: string | null
          hosted_zone_id?: string | null
          id?: string
          regional_certificate_arn?: string | null
          service_id: string
          updated_at?: string | null
          verification_meta?: Json | null
          verification_method?: string | null
          verified?: boolean
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          domain?: string
          global_certificate_arn?: string | null
          hosted_zone_id?: string | null
          id?: string
          regional_certificate_arn?: string | null
          service_id?: string
          updated_at?: string | null
          verification_meta?: Json | null
          verification_method?: string | null
          verified?: boolean
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "domains_service_id_services_id_fk"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      environments: {
        Row: {
          application_id: string
          created_at: string
          deleted_at: string | null
          display_name: string
          id: string
          metadata: Json | null
          name: string
          provider_id: string | null
          region: string | null
          updated_at: string | null
        }
        Insert: {
          application_id: string
          created_at?: string
          deleted_at?: string | null
          display_name: string
          id: string
          metadata?: Json | null
          name: string
          provider_id?: string | null
          region?: string | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          id?: string
          metadata?: Json | null
          name?: string
          provider_id?: string | null
          region?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "environments_application_id_applications_id_fk"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "environments_provider_id_providers_id_fk"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          deleted_at: string | null
          environment_id: string
          pipeline_end: string | null
          pipeline_execution_id: string
          pipeline_log: Json | null
          pipeline_metadata: Json | null
          pipeline_start: string | null
          pipeline_state: Database["public"]["Enums"]["PIPELINE_STATUS"] | null
          service_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          environment_id: string
          pipeline_end?: string | null
          pipeline_execution_id: string
          pipeline_log?: Json | null
          pipeline_metadata?: Json | null
          pipeline_start?: string | null
          pipeline_state?: Database["public"]["Enums"]["PIPELINE_STATUS"] | null
          service_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          environment_id?: string
          pipeline_end?: string | null
          pipeline_execution_id?: string
          pipeline_log?: Json | null
          pipeline_metadata?: Json | null
          pipeline_start?: string | null
          pipeline_state?: Database["public"]["Enums"]["PIPELINE_STATUS"] | null
          service_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_environment_id_environments_id_fk"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_service_id_services_id_fk"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      installations: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: number
          installation_id: number
          metadata: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: never
          installation_id: number
          metadata: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: never
          installation_id?: number
          metadata?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installations_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          access: Database["public"]["Enums"]["ACCOUNT_ACCESS"]
          created_at: string
          deleted_at: string | null
          id: number
          organization_id: string
          pending: boolean
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access?: Database["public"]["Enums"]["ACCOUNT_ACCESS"]
          created_at?: string
          deleted_at?: string | null
          id?: never
          organization_id: string
          pending?: boolean
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access?: Database["public"]["Enums"]["ACCOUNT_ACCESS"]
          created_at?: string
          deleted_at?: string | null
          id?: never
          organization_id?: string
          pending?: boolean
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          channel: Database["public"]["Enums"]["NOTIFICATION_CHANNEL"]
          created_at: string
          environment_id: string
          id: string
          metadata: Json
          organization_id: string
          type: Database["public"]["Enums"]["NOTIFICATION_TYPE"]
        }
        Insert: {
          channel?: Database["public"]["Enums"]["NOTIFICATION_CHANNEL"]
          created_at?: string
          environment_id: string
          id?: string
          metadata: Json
          organization_id: string
          type: Database["public"]["Enums"]["NOTIFICATION_TYPE"]
        }
        Update: {
          channel?: Database["public"]["Enums"]["NOTIFICATION_CHANNEL"]
          created_at?: string
          environment_id?: string
          id?: string
          metadata?: Json
          organization_id?: string
          type?: Database["public"]["Enums"]["NOTIFICATION_TYPE"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_environment_id_environments_id_fk"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          organization_id: string
          product_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          metadata?: Json | null
          organization_id: string
          product_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          organization_id?: string
          product_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_products_id_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          metadata: Json | null
          name: string
          pending: boolean
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          metadata?: Json | null
          name: string
          pending?: boolean
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          pending?: boolean
          updated_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          name: string
          updated_at: string | null
        }
        Insert: {
          active: boolean
          created_at?: string
          description?: string | null
          id: string
          metadata?: Json | null
          name: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      providers: {
        Row: {
          access_key_id: string | null
          account_id: string | null
          alias: string | null
          created_at: string
          deleted_at: string | null
          id: string
          organization_id: string
          region: string | null
          role_arn: string | null
          secret_id: string | null
          stack_id: string | null
          stack_name: string | null
          updated_at: string | null
        }
        Insert: {
          access_key_id?: string | null
          account_id?: string | null
          alias?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          organization_id: string
          region?: string | null
          role_arn?: string | null
          secret_id?: string | null
          stack_id?: string | null
          stack_name?: string | null
          updated_at?: string | null
        }
        Update: {
          access_key_id?: string | null
          account_id?: string | null
          alias?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          organization_id?: string
          region?: string | null
          role_arn?: string | null
          secret_id?: string | null
          stack_id?: string | null
          stack_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "providers_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      service_secrets: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          key: string
          resource_arn: string | null
          service_id: string
          type: Database["public"]["Enums"]["VARIABLE_TYPE"]
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          key: string
          resource_arn?: string | null
          service_id: string
          type: Database["public"]["Enums"]["VARIABLE_TYPE"]
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          key?: string
          resource_arn?: string | null
          service_id?: string
          type?: Database["public"]["Enums"]["VARIABLE_TYPE"]
          updated_at?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_secrets_service_id_services_id_fk"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_variables: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          key: string
          service_id: string
          type: Database["public"]["Enums"]["VARIABLE_TYPE"]
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          key: string
          service_id: string
          type: Database["public"]["Enums"]["VARIABLE_TYPE"]
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          key?: string
          service_id?: string
          type?: Database["public"]["Enums"]["VARIABLE_TYPE"]
          updated_at?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_variables_service_id_services_id_fk"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          branch: string | null
          created_at: string
          deleted_at: string | null
          display_name: string
          environment_id: string
          id: string
          installation_id: number | null
          metadata: Json | null
          name: string
          owner: string | null
          repo: string | null
          resources: Json | null
          stack_type: Database["public"]["Enums"]["STACK_TYPE"]
          stack_version: string
          updated_at: string | null
        }
        Insert: {
          branch?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name: string
          environment_id: string
          id: string
          installation_id?: number | null
          metadata?: Json | null
          name: string
          owner?: string | null
          repo?: string | null
          resources?: Json | null
          stack_type?: Database["public"]["Enums"]["STACK_TYPE"]
          stack_version: string
          updated_at?: string | null
        }
        Update: {
          branch?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          environment_id?: string
          id?: string
          installation_id?: number | null
          metadata?: Json | null
          name?: string
          owner?: string | null
          repo?: string | null
          resources?: Json | null
          stack_type?: Database["public"]["Enums"]["STACK_TYPE"]
          stack_version?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_environment_id_environments_id_fk"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_installation_id_installations_installation_id_fk"
            columns: ["installation_id"]
            isOneToOne: false
            referencedRelation: "installations"
            referencedColumns: ["installation_id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at: string | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          created: string
          current_period_end: string
          current_period_start: string
          ended_at: string | null
          id: string
          metadata: Json | null
          organization_id: string
          polar_customer_id: string
          product_id: string | null
          status: Database["public"]["Enums"]["SUBSCRIPTION_STATUS"]
          user_id: string
        }
        Insert: {
          cancel_at?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created?: string
          current_period_end?: string
          current_period_start?: string
          ended_at?: string | null
          id: string
          metadata?: Json | null
          organization_id: string
          polar_customer_id: string
          product_id?: string | null
          status: Database["public"]["Enums"]["SUBSCRIPTION_STATUS"]
          user_id: string
        }
        Update: {
          cancel_at?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created?: string
          current_period_end?: string
          current_period_start?: string
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          polar_customer_id?: string
          product_id?: string | null
          status?: Database["public"]["Enums"]["SUBSCRIPTION_STATUS"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_product_id_products_id_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_organization_id_customers_user_id_organiz"
            columns: ["user_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["user_id", "organization_id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_access_tokens: {
        Row: {
          created_at: string
          deleted_at: string | null
          environment_id: string | null
          resource: string | null
          secret_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          environment_id?: string | null
          resource?: string | null
          secret_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          environment_id?: string | null
          resource?: string | null
          secret_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_access_tokens_environment_id_environments_id_fk"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_access_tokens_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          email: string | null
          email_enabled: boolean
          full_name: string | null
          id: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          email?: string | null
          email_enabled?: boolean
          full_name?: string | null
          id: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          email?: string | null
          email_enabled?: boolean
          full_name?: string | null
          id?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_user_organizations: {
        Row: {
          organization_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      ACCOUNT_ACCESS: "READ_ONLY" | "READ_WRITE" | "ADMIN" | "OWNER"
      APPLICATION_STATUS: "PENDING" | "CONFIGURED" | "READY"
      BUILD_STATUS:
        | "NULL"
        | "IN_PROGRESS"
        | "SUCCEEDED"
        | "FAILED"
        | "FAULT"
        | "TIMED_OUT"
        | "STOPPED"
      BUILD_SYSTEM: "Nixpacks" | "Buildpacks" | "Dockerfile"
      NOTIFICATION_CHANNEL: "EMAIL" | "SLACK" | "DISCORD" | "IN_APP"
      NOTIFICATION_TYPE:
        | "APP_BUILD_SUCCESS"
        | "APP_BUILD_FAILURE"
        | "APP_DEPLOY_SUCCESS"
        | "APP_DEPLOY_FAILURE"
      PIPELINE_STATUS:
        | "NULL"
        | "STARTED"
        | "SUCCEEDED"
        | "RESUMED"
        | "FAILED"
        | "CANCELED"
        | "SUPERSEDED"
      PRICING_PLAN_INTERVAL: "month" | "year"
      PRICING_TYPE: "one_time" | "recurring"
      STACK_TYPE: "STATIC" | "LAMBDA" | "FARGATE"
      SUBSCRIPTION_STATUS:
        | "trialing"
        | "active"
        | "canceled"
        | "incomplete"
        | "incomplete_expired"
        | "past_due"
        | "unpaid"
        | "paused"
      VARIABLE_TYPE: "build" | "runtime"
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
      ACCOUNT_ACCESS: ["READ_ONLY", "READ_WRITE", "ADMIN", "OWNER"],
      APPLICATION_STATUS: ["PENDING", "CONFIGURED", "READY"],
      BUILD_STATUS: [
        "NULL",
        "IN_PROGRESS",
        "SUCCEEDED",
        "FAILED",
        "FAULT",
        "TIMED_OUT",
        "STOPPED",
      ],
      BUILD_SYSTEM: ["Nixpacks", "Buildpacks", "Dockerfile"],
      NOTIFICATION_CHANNEL: ["EMAIL", "SLACK", "DISCORD", "IN_APP"],
      NOTIFICATION_TYPE: [
        "APP_BUILD_SUCCESS",
        "APP_BUILD_FAILURE",
        "APP_DEPLOY_SUCCESS",
        "APP_DEPLOY_FAILURE",
      ],
      PIPELINE_STATUS: [
        "NULL",
        "STARTED",
        "SUCCEEDED",
        "RESUMED",
        "FAILED",
        "CANCELED",
        "SUPERSEDED",
      ],
      PRICING_PLAN_INTERVAL: ["month", "year"],
      PRICING_TYPE: ["one_time", "recurring"],
      STACK_TYPE: ["STATIC", "LAMBDA", "FARGATE"],
      SUBSCRIPTION_STATUS: [
        "trialing",
        "active",
        "canceled",
        "incomplete",
        "incomplete_expired",
        "past_due",
        "unpaid",
        "paused",
      ],
      VARIABLE_TYPE: ["build", "runtime"],
    },
  },
} as const
