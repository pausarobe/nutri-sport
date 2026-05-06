export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          sex: ClientSex | null;
          birth_date: string | null;
          height_cm: number | null;
          weight_kg: number | null;
          sport: string | null;
          activity_level: ActivityLevel | null;
          goal: string | null;
          allergies: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          sex?: ClientSex | null;
          birth_date?: string | null;
          height_cm?: number | null;
          weight_kg?: number | null;
          sport?: string | null;
          activity_level?: ActivityLevel | null;
          goal?: string | null;
          allergies?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          sex?: ClientSex | null;
          birth_date?: string | null;
          height_cm?: number | null;
          weight_kg?: number | null;
          sport?: string | null;
          activity_level?: ActivityLevel | null;
          goal?: string | null;
          allergies?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      plans: {
        Row: {
          id: string;
          user_id: string;
          client_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          client_id: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          client_id?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plans_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: true;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      client_notes: {
        Row: {
          id: string;
          user_id: string;
          client_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          client_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          client_id?: string;
          content?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_notes_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      client_files: {
        Row: {
          id: string;
          user_id: string;
          client_id: string;
          bucket_id: string;
          path: string;
          file_name: string;
          content_type: string | null;
          size_bytes: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          client_id: string;
          bucket_id?: string;
          path: string;
          file_name: string;
          content_type?: string | null;
          size_bytes?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          client_id?: string;
          bucket_id?: string;
          path?: string;
          file_name?: string;
          content_type?: string | null;
          size_bytes?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_files_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type ClientSex =
  | "female"
  | "male"
  | "non_binary"
  | "prefer_not_to_say";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "high"
  | "very_high";

export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type Plan = Database["public"]["Tables"]["plans"]["Row"];
export type ClientNote = Database["public"]["Tables"]["client_notes"]["Row"];
export type ClientFile = Database["public"]["Tables"]["client_files"]["Row"];
