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
      nutritionist_profiles: {
        Row: {
          user_id: string;
          display_name: string | null;
          clinic_name: string | null;
          professional_title: string | null;
          license_number: string | null;
          professional_email: string | null;
          phone: string | null;
          address: string | null;
          avatar_path: string | null;
          logo_path: string | null;
          signature_path: string | null;
          time_zone: string;
          locale: string;
          agenda_start_time: string;
          agenda_end_time: string;
          default_appointment_duration: number;
          appointment_types: string[];
          follow_up_days: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          display_name?: string | null;
          clinic_name?: string | null;
          professional_title?: string | null;
          license_number?: string | null;
          professional_email?: string | null;
          phone?: string | null;
          address?: string | null;
          avatar_path?: string | null;
          logo_path?: string | null;
          signature_path?: string | null;
          time_zone?: string;
          locale?: string;
          agenda_start_time?: string;
          agenda_end_time?: string;
          default_appointment_duration?: number;
          appointment_types?: string[];
          follow_up_days?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          display_name?: string | null;
          clinic_name?: string | null;
          professional_title?: string | null;
          license_number?: string | null;
          professional_email?: string | null;
          phone?: string | null;
          address?: string | null;
          avatar_path?: string | null;
          logo_path?: string | null;
          signature_path?: string | null;
          time_zone?: string;
          locale?: string;
          agenda_start_time?: string;
          agenda_end_time?: string;
          default_appointment_duration?: number;
          appointment_types?: string[];
          follow_up_days?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          status: ClientStatus;
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
          status?: ClientStatus;
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
          status?: ClientStatus;
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
          calories: number | null;
          protein_g: number | null;
          carbs_g: number | null;
          fat_g: number | null;
          energy_settings: Json;
          meal_distribution: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          client_id: string;
          content?: string;
          calories?: number | null;
          protein_g?: number | null;
          carbs_g?: number | null;
          fat_g?: number | null;
          energy_settings?: Json;
          meal_distribution?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          client_id?: string;
          content?: string;
          calories?: number | null;
          protein_g?: number | null;
          carbs_g?: number | null;
          fat_g?: number | null;
          energy_settings?: Json;
          meal_distribution?: Json;
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
          note_type: "normal" | "supplement";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          client_id: string;
          content: string;
          note_type?: "normal" | "supplement";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          client_id?: string;
          content?: string;
          note_type?: "normal" | "supplement";
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
      client_weight_logs: {
        Row: {
          id: string;
          user_id: string;
          client_id: string;
          measured_at: string;
          weight_kg: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          client_id: string;
          measured_at?: string;
          weight_kg: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          client_id?: string;
          measured_at?: string;
          weight_kg?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_weight_logs_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      client_anthropometry_assessments: {
        Row: {
          id: string;
          user_id: string;
          client_id: string;
          measured_at: string;
          height_cm: number;
          weight_kg: number;
          sex: ClientSex | null;
          race: AnthropometryRace;
          sitting_height_cm: number | null;
          arm_span_cm: number | null;
          skinfolds: Json;
          girths: Json;
          diameters: Json;
          measurements3: Json;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          client_id: string;
          measured_at?: string;
          height_cm: number;
          weight_kg: number;
          sex?: ClientSex | null;
          race?: AnthropometryRace;
          sitting_height_cm?: number | null;
          arm_span_cm?: number | null;
          skinfolds?: Json;
          girths?: Json;
          diameters?: Json;
          measurements3?: Json;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          client_id?: string;
          measured_at?: string;
          height_cm?: number;
          weight_kg?: number;
          sex?: ClientSex | null;
          race?: AnthropometryRace;
          sitting_height_cm?: number | null;
          arm_span_cm?: number | null;
          skinfolds?: Json;
          girths?: Json;
          diameters?: Json;
          measurements3?: Json;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_anthropometry_assessments_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      client_appointments: {
        Row: {
          id: string;
          user_id: string;
          client_id: string;
          scheduled_date: string;
          scheduled_time: string | null;
          duration_minutes: number;
          appointment_type: string;
          notes: string | null;
          completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          client_id: string;
          scheduled_date: string;
          scheduled_time?: string | null;
          duration_minutes?: number;
          appointment_type?: string;
          notes?: string | null;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          client_id?: string;
          scheduled_date?: string;
          scheduled_time?: string | null;
          duration_minutes?: number;
          appointment_type?: string;
          notes?: string | null;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_appointments_client_id_fkey";
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

export type ClientSex = "female" | "male";

export type ClientStatus = "active" | "paused" | "inactive";

export type AnthropometryRace = "caucasian" | "black" | "asian";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "high"
  | "very_high";

export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type NutritionistProfile =
  Database["public"]["Tables"]["nutritionist_profiles"]["Row"];
export type Plan = Database["public"]["Tables"]["plans"]["Row"];
export type ClientNote = Database["public"]["Tables"]["client_notes"]["Row"];
export type ClientFile = Database["public"]["Tables"]["client_files"]["Row"];
export type ClientWeightLog =
  Database["public"]["Tables"]["client_weight_logs"]["Row"];
export type ClientAnthropometryAssessment =
  Database["public"]["Tables"]["client_anthropometry_assessments"]["Row"];
export type ClientAppointment =
  Database["public"]["Tables"]["client_appointments"]["Row"];
