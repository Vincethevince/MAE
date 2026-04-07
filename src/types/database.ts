export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "user" | "provider";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          role: UserRole;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          role?: UserRole;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          phone?: string | null;
          role?: UserRole;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      providers: {
        Row: {
          id: string;
          profile_id: string;
          business_name: string;
          description: string | null;
          address: string;
          city: string;
          postal_code: string;
          latitude: number | null;
          longitude: number | null;
          phone: string | null;
          website: string | null;
          category: string;
          rating: number;
          review_count: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          business_name: string;
          description?: string | null;
          address: string;
          city: string;
          postal_code: string;
          latitude?: number | null;
          longitude?: number | null;
          phone?: string | null;
          website?: string | null;
          category: string;
          rating?: number;
          review_count?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          business_name?: string;
          description?: string | null;
          address?: string;
          city?: string;
          postal_code?: string;
          latitude?: number | null;
          longitude?: number | null;
          phone?: string | null;
          website?: string | null;
          category?: string;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      employees: {
        Row: {
          id: string;
          provider_id: string;
          name: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          name: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          is_active?: boolean;
        };
      };
      services: {
        Row: {
          id: string;
          provider_id: string;
          name: string;
          description: string | null;
          duration_minutes: number;
          price_cents: number;
          category: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          name: string;
          description?: string | null;
          duration_minutes: number;
          price_cents: number;
          category: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          duration_minutes?: number;
          price_cents?: number;
          category?: string;
          is_active?: boolean;
        };
      };
      availability: {
        Row: {
          id: string;
          provider_id: string;
          employee_id: string | null;
          day_of_week: number;
          start_time: string;
          end_time: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          employee_id?: string | null;
          day_of_week: number;
          start_time: string;
          end_time: string;
          created_at?: string;
        };
        Update: {
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
        };
      };
      appointments: {
        Row: {
          id: string;
          user_id: string | null;
          provider_id: string;
          employee_id: string | null;
          service_id: string;
          start_time: string;
          end_time: string;
          status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
          notes: string | null;
          provider_notes: string | null;
          price_cents: number;
          reminder_24h_sent_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider_id: string;
          employee_id?: string | null;
          service_id: string;
          start_time: string;
          end_time: string;
          status?: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
          notes?: string | null;
          provider_notes?: string | null;
          price_cents: number;
          reminder_24h_sent_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          employee_id?: string | null;
          start_time?: string;
          end_time?: string;
          status?: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
          notes?: string | null;
          provider_notes?: string | null;
          reminder_24h_sent_at?: string | null;
          updated_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          user_id: string | null;
          provider_id: string;
          appointment_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider_id: string;
          appointment_id: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          rating?: number;
          comment?: string | null;
        };
      };
      provider_blocks: {
        Row: {
          id: string;
          provider_id: string;
          start_time: string;
          end_time: string;
          label: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          start_time: string;
          end_time: string;
          label?: string | null;
          created_at?: string;
        };
        Update: {
          start_time?: string;
          end_time?: string;
          label?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      appointment_status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
    };
  };
}
