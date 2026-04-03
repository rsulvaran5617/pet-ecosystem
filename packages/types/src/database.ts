import type {
  AddressLabel,
  CoreRole,
  PaymentMethodBrand,
  PaymentMethodStatus,
  PaymentMethodType
} from "./core";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          phone: string | null;
          avatar_url: string | null;
          locale: string;
          marketing_opt_in: boolean;
          reminder_email_opt_in: boolean;
          reminder_push_opt_in: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          first_name?: string;
          last_name?: string;
          phone?: string | null;
          avatar_url?: string | null;
          locale?: string;
          marketing_opt_in?: boolean;
          reminder_email_opt_in?: boolean;
          reminder_push_opt_in?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string;
          last_name?: string;
          phone?: string | null;
          avatar_url?: string | null;
          locale?: string;
          marketing_opt_in?: boolean;
          reminder_email_opt_in?: boolean;
          reminder_push_opt_in?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: CoreRole;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: CoreRole;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: CoreRole;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_addresses: {
        Row: {
          id: string;
          user_id: string;
          label: AddressLabel;
          recipient_name: string;
          line_1: string;
          line_2: string | null;
          city: string;
          state_region: string;
          postal_code: string;
          country_code: string;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label: AddressLabel;
          recipient_name: string;
          line_1: string;
          line_2?: string | null;
          city: string;
          state_region: string;
          postal_code: string;
          country_code: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          label?: AddressLabel;
          recipient_name?: string;
          line_1?: string;
          line_2?: string | null;
          city?: string;
          state_region?: string;
          postal_code?: string;
          country_code?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payment_methods: {
        Row: {
          id: string;
          user_id: string;
          type: PaymentMethodType;
          brand: PaymentMethodBrand;
          last_4: string;
          exp_month: number;
          exp_year: number;
          cardholder_name: string;
          processor_reference: string | null;
          is_default: boolean;
          status: PaymentMethodStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type?: PaymentMethodType;
          brand: PaymentMethodBrand;
          last_4: string;
          exp_month: number;
          exp_year: number;
          cardholder_name: string;
          processor_reference?: string | null;
          is_default?: boolean;
          status?: PaymentMethodStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: PaymentMethodType;
          brand?: PaymentMethodBrand;
          last_4?: string;
          exp_month?: number;
          exp_year?: number;
          cardholder_name?: string;
          processor_reference?: string | null;
          is_default?: boolean;
          status?: PaymentMethodStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      switch_active_user_role: {
        Args: {
          next_role: CoreRole;
        };
        Returns: Array<Database["public"]["Tables"]["user_roles"]["Row"]>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
