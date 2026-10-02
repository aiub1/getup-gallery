// ATENÇÃO: gerado no galeria-core e depois editado À MÃO para incluir a
// migration 0007 (events.is_public e as funções public_*). Depois que o core
// aplicar a migration, regenere com `supabase gen types` e substitua este arquivo.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      access_logs: {
        Row: {
          action: string;
          created_at: string;
          id: number;
          target_id: string | null;
          user_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string;
          id?: number;
          target_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string;
          id?: number;
          target_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "access_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          cover_key: string | null;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          description: string | null;
          event_date: string;
          id: string;
          is_public: boolean;
          name: string;
          slug: string;
        };
        Insert: {
          cover_key?: string | null;
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          description?: string | null;
          event_date: string;
          id?: string;
          is_public?: boolean;
          name: string;
          slug: string;
        };
        Update: {
          cover_key?: string | null;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          description?: string | null;
          event_date?: string;
          id?: string;
          is_public?: boolean;
          name?: string;
          slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      face_consents: {
        Row: {
          granted_at: string;
          id: string;
          revoked_at: string | null;
          terms_version: string;
          user_id: string;
        };
        Insert: {
          granted_at?: string;
          id?: string;
          revoked_at?: string | null;
          terms_version: string;
          user_id: string;
        };
        Update: {
          granted_at?: string;
          id?: string;
          revoked_at?: string | null;
          terms_version?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "face_consents_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      guardians: {
        Row: {
          created_at: string;
          created_by: string;
          guardian_id: string;
          minor_id: string;
          relation: string | null;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          guardian_id: string;
          minor_id: string;
          relation?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          guardian_id?: string;
          minor_id?: string;
          relation?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "guardians_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "guardians_guardian_id_fkey";
            columns: ["guardian_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "guardians_minor_id_fkey";
            columns: ["minor_id"];
            isOneToOne: false;
            referencedRelation: "minors";
            referencedColumns: ["id"];
          },
        ];
      };
      jobs: {
        Row: {
          attempts: number;
          created_at: string;
          id: number;
          last_error: string | null;
          locked_at: string | null;
          locked_by: string | null;
          payload: NonNullable<Json>;
          run_after: string;
          status: string;
          type: string;
        };
        Insert: {
          attempts?: number;
          created_at?: string;
          id?: number;
          last_error?: string | null;
          locked_at?: string | null;
          locked_by?: string | null;
          payload: NonNullable<Json>;
          run_after?: string;
          status?: string;
          type: string;
        };
        Update: {
          attempts?: number;
          created_at?: string;
          id?: number;
          last_error?: string | null;
          locked_at?: string | null;
          locked_by?: string | null;
          payload?: NonNullable<Json>;
          run_after?: string;
          status?: string;
          type?: string;
        };
        Relationships: [];
      };
      minor_consents: {
        Row: {
          granted_at: string;
          guardian_id: string;
          id: string;
          minor_id: string;
          revoked_at: string | null;
          terms_version: string;
        };
        Insert: {
          granted_at?: string;
          guardian_id: string;
          id?: string;
          minor_id: string;
          revoked_at?: string | null;
          terms_version: string;
        };
        Update: {
          granted_at?: string;
          guardian_id?: string;
          id?: string;
          minor_id?: string;
          revoked_at?: string | null;
          terms_version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "minor_consents_guardian_id_fkey";
            columns: ["guardian_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "minor_consents_minor_id_fkey";
            columns: ["minor_id"];
            isOneToOne: false;
            referencedRelation: "minors";
            referencedColumns: ["id"];
          },
        ];
      };
      minors: {
        Row: {
          birth_date: string | null;
          created_at: string;
          created_by: string;
          full_name: string;
          id: string;
          notes: string | null;
        };
        Insert: {
          birth_date?: string | null;
          created_at?: string;
          created_by: string;
          full_name: string;
          id?: string;
          notes?: string | null;
        };
        Update: {
          birth_date?: string | null;
          created_at?: string;
          created_by?: string;
          full_name?: string;
          id?: string;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "minors_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      photo_faces: {
        Row: {
          bbox: Json | null;
          created_at: string;
          embedding: string;
          event_id: string;
          id: string;
          photo_id: string;
          quality: number | null;
        };
        Insert: {
          bbox?: Json | null;
          created_at?: string;
          embedding: string;
          event_id: string;
          id?: string;
          photo_id: string;
          quality?: number | null;
        };
        Update: {
          bbox?: Json | null;
          created_at?: string;
          embedding?: string;
          event_id?: string;
          id?: string;
          photo_id?: string;
          quality?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "photo_faces_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "photo_faces_photo_id_fkey";
            columns: ["photo_id"];
            isOneToOne: false;
            referencedRelation: "photos";
            referencedColumns: ["id"];
          },
        ];
      };
      photo_grants: {
        Row: {
          granted_at: string;
          photo_id: string;
          user_id: string;
        };
        Insert: {
          granted_at?: string;
          photo_id: string;
          user_id: string;
        };
        Update: {
          granted_at?: string;
          photo_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "photo_grants_photo_id_fkey";
            columns: ["photo_id"];
            isOneToOne: false;
            referencedRelation: "photos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "photo_grants_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      photo_minors: {
        Row: {
          created_at: string;
          minor_id: string;
          photo_id: string;
          tagged_by: string;
        };
        Insert: {
          created_at?: string;
          minor_id: string;
          photo_id: string;
          tagged_by: string;
        };
        Update: {
          created_at?: string;
          minor_id?: string;
          photo_id?: string;
          tagged_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "photo_minors_minor_id_fkey";
            columns: ["minor_id"];
            isOneToOne: false;
            referencedRelation: "minors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "photo_minors_photo_id_fkey";
            columns: ["photo_id"];
            isOneToOne: false;
            referencedRelation: "photos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "photo_minors_tagged_by_fkey";
            columns: ["tagged_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      photos: {
        Row: {
          bytes: number | null;
          contains_minors: boolean | null;
          created_at: string;
          deleted_at: string | null;
          event_id: string;
          height: number | null;
          id: string;
          is_private: boolean;
          session_id: string | null;
          status: Database["public"]["Enums"]["photo_status"];
          storage_key: string;
          taken_at: string | null;
          thumb_key: string;
          uploaded_by: string;
          web_key: string;
          width: number | null;
        };
        Insert: {
          bytes?: number | null;
          contains_minors?: boolean | null;
          created_at?: string;
          deleted_at?: string | null;
          event_id: string;
          height?: number | null;
          id?: string;
          is_private?: boolean;
          session_id?: string | null;
          status?: Database["public"]["Enums"]["photo_status"];
          storage_key: string;
          taken_at?: string | null;
          thumb_key: string;
          uploaded_by: string;
          web_key: string;
          width?: number | null;
        };
        Update: {
          bytes?: number | null;
          contains_minors?: boolean | null;
          created_at?: string;
          deleted_at?: string | null;
          event_id?: string;
          height?: number | null;
          id?: string;
          is_private?: boolean;
          session_id?: string | null;
          status?: Database["public"]["Enums"]["photo_status"];
          storage_key?: string;
          taken_at?: string | null;
          thumb_key?: string;
          uploaded_by?: string;
          web_key?: string;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "photos_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "photos_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "photos_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_key: string | null;
          created_at: string;
          full_name: string;
          id: string;
          is_active: boolean;
          role: Database["public"]["Enums"]["user_role"];
        };
        Insert: {
          avatar_key?: string | null;
          created_at?: string;
          full_name: string;
          id: string;
          is_active?: boolean;
          role?: Database["public"]["Enums"]["user_role"];
        };
        Update: {
          avatar_key?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          is_active?: boolean;
          role?: Database["public"]["Enums"]["user_role"];
        };
        Relationships: [];
      };
      removal_requests: {
        Row: {
          created_at: string;
          id: string;
          photo_id: string;
          reason: string | null;
          requested_by: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          photo_id: string;
          reason?: string | null;
          requested_by: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          photo_id?: string;
          reason?: string | null;
          requested_by?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "removal_requests_photo_id_fkey";
            columns: ["photo_id"];
            isOneToOne: false;
            referencedRelation: "photos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "removal_requests_requested_by_fkey";
            columns: ["requested_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "removal_requests_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      sessions: {
        Row: {
          created_at: string;
          created_by: string;
          event_id: string;
          id: string;
          name: string;
          position: number;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          event_id: string;
          id?: string;
          name: string;
          position?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          event_id?: string;
          id?: string;
          name?: string;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sessions_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      can_upload: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_guardian_of_photo: { Args: { p_photo_id: string }; Returns: boolean };
      is_member: { Args: Record<PropertyKey, never>; Returns: boolean };
      my_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      public_event: {
        Args: { p_slug: string };
        Returns: {
          cover_key: string | null;
          description: string | null;
          event_date: string;
          id: string;
          name: string;
          photo_count: number;
          slug: string;
        }[];
      };
      public_event_photos: {
        Args: { p_limit?: number; p_offset?: number; p_session_id?: string | null; p_slug: string };
        Returns: {
          height: number | null;
          id: string;
          session_id: string | null;
          taken_at: string | null;
          thumb_key: string;
          web_key: string;
          width: number | null;
        }[];
      };
      public_event_sessions: {
        Args: { p_slug: string };
        Returns: {
          id: string;
          name: string;
          photo_count: number;
          position: number;
        }[];
      };
      public_photo: {
        Args: { p_id: string };
        Returns: {
          event_slug: string;
          id: string;
          session_name: string | null;
          thumb_key: string;
          web_key: string;
        }[];
      };
      search_faces: {
        Args: { p_embedding: string; p_event_id?: string; p_limit?: number; p_threshold?: number };
        Returns: {
          distance: number;
          photo_id: string;
        }[];
      };
    };
    Enums: {
      photo_status: "pending_review" | "pending" | "indexing" | "indexed" | "failed" | "skipped";
      user_role: "admin" | "uploader" | "member";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      photo_status: ["pending_review", "pending", "indexing", "indexed", "failed", "skipped"],
      user_role: ["admin", "uploader", "member"],
    },
  },
} as const;
