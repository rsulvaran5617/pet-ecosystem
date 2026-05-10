import type {
  AddressLabel,
  CoreRole,
  PaymentMethodBrand,
  PaymentMethodStatus,
  PaymentMethodType
} from "./core";
import type { PetConditionStatus } from "./health";
import type { HouseholdInvitationStatus, HouseholdPermission } from "./households";
import type {
  BookingMode,
  BookingSlotStatus,
  BookingStatus
} from "./bookings";
import type {
  ProviderApprovalStatus,
  ProviderServiceCategory
} from "./marketplace";
import type { PetDocumentType, PetSex, PetStatus } from "./pets";
import type { ProviderApprovalDocumentType } from "./providers";
import type { SupportCaseStatus } from "./support";
import type {
  CalendarEventStatus,
  CalendarEventType,
  ReminderSourceRecordType,
  ReminderStatus,
  ReminderType
} from "./reminders";

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
      audit_logs: {
        Row: {
          id: string;
          actor_user_id: string;
          entity_type: string;
          entity_id: string;
          action: string;
          context: unknown;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_user_id: string;
          entity_type: string;
          entity_id: string;
          action: string;
          context?: unknown;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_user_id?: string;
          entity_type?: string;
          entity_id?: string;
          action?: string;
          context?: unknown;
          created_at?: string;
        };
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          household_id: string;
          pet_id: string;
          provider_organization_id: string;
          provider_service_id: string;
          booked_by_user_id: string;
          selected_payment_method_id: string | null;
          booking_mode: BookingMode;
          status: BookingStatus;
          scheduled_start_at: string;
          scheduled_end_at: string;
          cancellation_deadline_at: string;
          cancellation_window_hours: number;
          availability_rule_id: string | null;
          slot_start_at: string | null;
          slot_end_at: string | null;
          cancelled_at: string | null;
          cancel_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          pet_id: string;
          provider_organization_id: string;
          provider_service_id: string;
          booked_by_user_id: string;
          selected_payment_method_id?: string | null;
          booking_mode: BookingMode;
          status: BookingStatus;
          scheduled_start_at: string;
          scheduled_end_at: string;
          cancellation_deadline_at: string;
          cancellation_window_hours: number;
          availability_rule_id?: string | null;
          slot_start_at?: string | null;
          slot_end_at?: string | null;
          cancelled_at?: string | null;
          cancel_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          pet_id?: string;
          provider_organization_id?: string;
          provider_service_id?: string;
          booked_by_user_id?: string;
          selected_payment_method_id?: string | null;
          booking_mode?: BookingMode;
          status?: BookingStatus;
          scheduled_start_at?: string;
          scheduled_end_at?: string;
          cancellation_deadline_at?: string;
          cancellation_window_hours?: number;
          availability_rule_id?: string | null;
          slot_start_at?: string | null;
          slot_end_at?: string | null;
          cancelled_at?: string | null;
          cancel_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      booking_pricing: {
        Row: {
          id: string;
          booking_id: string;
          provider_service_id: string;
          service_name: string;
          currency_code: string;
          unit_price_cents: number;
          subtotal_price_cents: number;
          total_price_cents: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          provider_service_id: string;
          service_name: string;
          currency_code: string;
          unit_price_cents: number;
          subtotal_price_cents: number;
          total_price_cents: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          provider_service_id?: string;
          service_name?: string;
          currency_code?: string;
          unit_price_cents?: number;
          subtotal_price_cents?: number;
          total_price_cents?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      booking_status_history: {
        Row: {
          id: string;
          booking_id: string;
          from_status: BookingStatus | null;
          to_status: BookingStatus;
          changed_by_user_id: string;
          change_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          from_status?: BookingStatus | null;
          to_status: BookingStatus;
          changed_by_user_id: string;
          change_reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          from_status?: BookingStatus | null;
          to_status?: BookingStatus;
          changed_by_user_id?: string;
          change_reason?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      booking_operations: {
        Row: {
          id: string;
          booking_id: string;
          operation_type: "check_in" | "check_out";
          created_by_user_id: string;
          location_latitude: number | null;
          location_longitude: number | null;
          location_label: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          operation_type: "check_in" | "check_out";
          created_by_user_id: string;
          location_latitude?: number | null;
          location_longitude?: number | null;
          location_label?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          operation_type?: "check_in" | "check_out";
          created_by_user_id?: string;
          location_latitude?: number | null;
          location_longitude?: number | null;
          location_label?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      booking_operation_evidence: {
        Row: {
          id: string;
          booking_id: string;
          storage_bucket: string;
          storage_path: string;
          file_name: string;
          file_size_bytes: number;
          mime_type: string | null;
          uploaded_by_user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          storage_bucket?: string;
          storage_path: string;
          file_name: string;
          file_size_bytes: number;
          mime_type?: string | null;
          uploaded_by_user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          storage_bucket?: string;
          storage_path?: string;
          file_name?: string;
          file_size_bytes?: number;
          mime_type?: string | null;
          uploaded_by_user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      booking_operation_report: {
        Row: {
          id: string;
          booking_id: string;
          report_text: string;
          created_by_user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          report_text: string;
          created_by_user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          report_text?: string;
          created_by_user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      booking_operation_notes: {
        Row: {
          id: string;
          booking_id: string;
          note_text: string;
          created_by_user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          note_text: string;
          created_by_user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          note_text?: string;
          created_by_user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      booking_operation_tokens: {
        Row: {
          id: string;
          booking_id: string;
          operation_type: "check_in" | "check_out";
          token_hash: string;
          token_preview: string | null;
          status: "active" | "used" | "expired" | "revoked";
          expires_at: string;
          used_at: string | null;
          used_by_user_id: string | null;
          created_by_user_id: string;
          created_at: string;
          revoked_at: string | null;
          revoked_by_user_id: string | null;
        };
        Insert: {
          id?: string;
          booking_id: string;
          operation_type: "check_in" | "check_out";
          token_hash: string;
          token_preview?: string | null;
          status?: "active" | "used" | "expired" | "revoked";
          expires_at: string;
          used_at?: string | null;
          used_by_user_id?: string | null;
          created_by_user_id: string;
          created_at?: string;
          revoked_at?: string | null;
          revoked_by_user_id?: string | null;
        };
        Update: {
          id?: string;
          booking_id?: string;
          operation_type?: "check_in" | "check_out";
          token_hash?: string;
          token_preview?: string | null;
          status?: "active" | "used" | "expired" | "revoked";
          expires_at?: string;
          used_at?: string | null;
          used_by_user_id?: string | null;
          created_by_user_id?: string;
          created_at?: string;
          revoked_at?: string | null;
          revoked_by_user_id?: string | null;
        };
        Relationships: [];
      };
      chat_threads: {
        Row: {
          id: string;
          booking_id: string;
          household_id: string;
          provider_organization_id: string;
          customer_user_id: string;
          provider_user_id: string;
          customer_display_name: string;
          provider_display_name: string;
          pet_name: string;
          service_name: string;
          booking_status: BookingStatus;
          last_message_at: string | null;
          last_message_preview: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          household_id: string;
          provider_organization_id: string;
          customer_user_id: string;
          provider_user_id: string;
          customer_display_name: string;
          provider_display_name: string;
          pet_name: string;
          service_name: string;
          booking_status: BookingStatus;
          last_message_at?: string | null;
          last_message_preview?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          household_id?: string;
          provider_organization_id?: string;
          customer_user_id?: string;
          provider_user_id?: string;
          customer_display_name?: string;
          provider_display_name?: string;
          pet_name?: string;
          service_name?: string;
          booking_status?: BookingStatus;
          last_message_at?: string | null;
          last_message_preview?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          thread_id: string;
          sender_user_id: string;
          message_text: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          sender_user_id: string;
          message_text: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          thread_id?: string;
          sender_user_id?: string;
          message_text?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          booking_id: string;
          household_id: string;
          pet_id: string;
          provider_organization_id: string;
          provider_service_id: string;
          reviewer_user_id: string;
          rating: number;
          comment_text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          household_id: string;
          pet_id: string;
          provider_organization_id: string;
          provider_service_id: string;
          reviewer_user_id: string;
          rating: number;
          comment_text: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          household_id?: string;
          pet_id?: string;
          provider_organization_id?: string;
          provider_service_id?: string;
          reviewer_user_id?: string;
          rating?: number;
          comment_text?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      support_cases: {
        Row: {
          id: string;
          booking_id: string;
          household_id: string;
          pet_id: string;
          provider_organization_id: string;
          provider_service_id: string;
          created_by_user_id: string;
          creator_email: string;
          creator_display_name: string;
          provider_name: string;
          service_name: string;
          pet_name: string;
          scheduled_start_at: string;
          scheduled_end_at: string;
          subject: string;
          description_text: string;
          status: SupportCaseStatus;
          admin_note: string | null;
          resolution_text: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          household_id: string;
          pet_id: string;
          provider_organization_id: string;
          provider_service_id: string;
          created_by_user_id: string;
          creator_email: string;
          creator_display_name: string;
          provider_name: string;
          service_name: string;
          pet_name: string;
          scheduled_start_at: string;
          scheduled_end_at: string;
          subject: string;
          description_text: string;
          status?: SupportCaseStatus;
          admin_note?: string | null;
          resolution_text?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          household_id?: string;
          pet_id?: string;
          provider_organization_id?: string;
          provider_service_id?: string;
          created_by_user_id?: string;
          creator_email?: string;
          creator_display_name?: string;
          provider_name?: string;
          service_name?: string;
          pet_name?: string;
          scheduled_start_at?: string;
          scheduled_end_at?: string;
          subject?: string;
          description_text?: string;
          status?: SupportCaseStatus;
          admin_note?: string | null;
          resolution_text?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      households: {
        Row: {
          id: string;
          name: string;
          created_by_user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_by_user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_by_user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      household_members: {
        Row: {
          id: string;
          household_id: string;
          user_id: string;
          created_by_user_id: string;
          permissions: HouseholdPermission[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          user_id: string;
          created_by_user_id: string;
          permissions: HouseholdPermission[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          user_id?: string;
          created_by_user_id?: string;
          permissions?: HouseholdPermission[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      household_invitations: {
        Row: {
          id: string;
          household_id: string;
          invited_user_id: string;
          invited_email: string;
          invited_by_user_id: string;
          permissions: HouseholdPermission[];
          status: HouseholdInvitationStatus;
          responded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          invited_user_id: string;
          invited_email: string;
          invited_by_user_id: string;
          permissions: HouseholdPermission[];
          status?: HouseholdInvitationStatus;
          responded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          invited_user_id?: string;
          invited_email?: string;
          invited_by_user_id?: string;
          permissions?: HouseholdPermission[];
          status?: HouseholdInvitationStatus;
          responded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pets: {
        Row: {
          id: string;
          household_id: string;
          created_by_user_id: string;
          name: string;
          species: string;
          status: PetStatus;
          in_memory_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          created_by_user_id: string;
          name: string;
          species: string;
          status?: PetStatus;
          in_memory_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          created_by_user_id?: string;
          name?: string;
          species?: string;
          status?: PetStatus;
          in_memory_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pet_profiles: {
        Row: {
          pet_id: string;
          breed: string | null;
          sex: PetSex;
          birth_date: string | null;
          notes: string | null;
          avatar_storage_bucket: string | null;
          avatar_storage_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          pet_id: string;
          breed?: string | null;
          sex?: PetSex;
          birth_date?: string | null;
          notes?: string | null;
          avatar_storage_bucket?: string | null;
          avatar_storage_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          pet_id?: string;
          breed?: string | null;
          sex?: PetSex;
          birth_date?: string | null;
          notes?: string | null;
          avatar_storage_bucket?: string | null;
          avatar_storage_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pet_documents: {
        Row: {
          id: string;
          pet_id: string;
          created_by_user_id: string;
          title: string;
          document_type: PetDocumentType;
          file_name: string;
          storage_bucket: string;
          storage_path: string;
          mime_type: string | null;
          file_size_bytes: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pet_id: string;
          created_by_user_id: string;
          title: string;
          document_type: PetDocumentType;
          file_name: string;
          storage_bucket?: string;
          storage_path: string;
          mime_type?: string | null;
          file_size_bytes?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pet_id?: string;
          created_by_user_id?: string;
          title?: string;
          document_type?: PetDocumentType;
          file_name?: string;
          storage_bucket?: string;
          storage_path?: string;
          mime_type?: string | null;
          file_size_bytes?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pet_vaccines: {
        Row: {
          id: string;
          pet_id: string;
          created_by_user_id: string;
          name: string;
          administered_on: string;
          next_due_on: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pet_id: string;
          created_by_user_id: string;
          name: string;
          administered_on: string;
          next_due_on?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pet_id?: string;
          created_by_user_id?: string;
          name?: string;
          administered_on?: string;
          next_due_on?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pet_allergies: {
        Row: {
          id: string;
          pet_id: string;
          created_by_user_id: string;
          allergen: string;
          reaction: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pet_id: string;
          created_by_user_id: string;
          allergen: string;
          reaction?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pet_id?: string;
          created_by_user_id?: string;
          allergen?: string;
          reaction?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pet_conditions: {
        Row: {
          id: string;
          pet_id: string;
          created_by_user_id: string;
          name: string;
          status: PetConditionStatus;
          diagnosed_on: string | null;
          is_critical: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pet_id: string;
          created_by_user_id: string;
          name: string;
          status?: PetConditionStatus;
          diagnosed_on?: string | null;
          is_critical?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pet_id?: string;
          created_by_user_id?: string;
          name?: string;
          status?: PetConditionStatus;
          diagnosed_on?: string | null;
          is_critical?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reminders: {
        Row: {
          id: string;
          household_id: string;
          pet_id: string | null;
          created_by_user_id: string;
          title: string;
          notes: string | null;
          reminder_type: ReminderType;
          status: ReminderStatus;
          due_at: string;
          completed_at: string | null;
          source_record_type: ReminderSourceRecordType | null;
          source_record_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          pet_id?: string | null;
          created_by_user_id: string;
          title: string;
          notes?: string | null;
          reminder_type?: ReminderType;
          status?: ReminderStatus;
          due_at: string;
          completed_at?: string | null;
          source_record_type?: ReminderSourceRecordType | null;
          source_record_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          pet_id?: string | null;
          created_by_user_id?: string;
          title?: string;
          notes?: string | null;
          reminder_type?: ReminderType;
          status?: ReminderStatus;
          due_at?: string;
          completed_at?: string | null;
          source_record_type?: ReminderSourceRecordType | null;
          source_record_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      calendar_events: {
        Row: {
          id: string;
          reminder_id: string;
          household_id: string;
          pet_id: string | null;
          event_type: CalendarEventType;
          title: string;
          starts_at: string;
          ends_at: string | null;
          status: CalendarEventStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reminder_id: string;
          household_id: string;
          pet_id?: string | null;
          event_type?: CalendarEventType;
          title: string;
          starts_at: string;
          ends_at?: string | null;
          status?: CalendarEventStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          reminder_id?: string;
          household_id?: string;
          pet_id?: string | null;
          event_type?: CalendarEventType;
          title?: string;
          starts_at?: string;
          ends_at?: string | null;
          status?: CalendarEventStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      provider_organizations: {
        Row: {
          id: string;
          owner_user_id: string;
          name: string;
          slug: string;
          city: string;
          country_code: string;
          approval_status: ProviderApprovalStatus;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          name: string;
          slug: string;
          city: string;
          country_code?: string;
          approval_status?: ProviderApprovalStatus;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_user_id?: string;
          name?: string;
          slug?: string;
          city?: string;
          country_code?: string;
          approval_status?: ProviderApprovalStatus;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      provider_public_profiles: {
        Row: {
          organization_id: string;
          headline: string;
          bio: string;
          avatar_url: string | null;
          avatar_storage_bucket: string | null;
          avatar_storage_path: string | null;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          headline: string;
          bio: string;
          avatar_url?: string | null;
          avatar_storage_bucket?: string | null;
          avatar_storage_path?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          organization_id?: string;
          headline?: string;
          bio?: string;
          avatar_url?: string | null;
          avatar_storage_bucket?: string | null;
          avatar_storage_path?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      provider_services: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          category: ProviderServiceCategory;
          short_description: string | null;
          species_served: string[];
          duration_minutes: number | null;
          booking_mode: BookingMode;
          base_price_cents: number;
          currency_code: string;
          cancellation_window_hours: number;
          is_public: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          category: ProviderServiceCategory;
          short_description?: string | null;
          species_served?: string[];
          duration_minutes?: number | null;
          booking_mode?: BookingMode;
          base_price_cents?: number;
          currency_code?: string;
          cancellation_window_hours?: number;
          is_public?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          category?: ProviderServiceCategory;
          short_description?: string | null;
          species_served?: string[];
          duration_minutes?: number | null;
          booking_mode?: BookingMode;
          base_price_cents?: number;
          currency_code?: string;
          cancellation_window_hours?: number;
          is_public?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      provider_availability: {
        Row: {
          id: string;
          organization_id: string;
          day_of_week: number;
          starts_at: string;
          ends_at: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          day_of_week: number;
          starts_at: string;
          ends_at: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          day_of_week?: number;
          starts_at?: string;
          ends_at?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      provider_availability_rules: {
        Row: {
          id: string;
          organization_id: string;
          service_id: string;
          day_of_week: number;
          starts_at: string;
          ends_at: string;
          capacity: number;
          is_active: boolean;
          effective_from: string | null;
          effective_until: string | null;
          created_by_user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          service_id: string;
          day_of_week: number;
          starts_at: string;
          ends_at: string;
          capacity: number;
          is_active?: boolean;
          effective_from?: string | null;
          effective_until?: string | null;
          created_by_user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          service_id?: string;
          day_of_week?: number;
          starts_at?: string;
          ends_at?: string;
          capacity?: number;
          is_active?: boolean;
          effective_from?: string | null;
          effective_until?: string | null;
          created_by_user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      provider_availability_exceptions: {
        Row: {
          id: string;
          organization_id: string;
          service_id: string | null;
          availability_rule_id: string | null;
          exception_date: string;
          starts_at: string | null;
          ends_at: string | null;
          capacity_override: number | null;
          is_closed: boolean;
          reason: string | null;
          created_by_user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          service_id?: string | null;
          availability_rule_id?: string | null;
          exception_date: string;
          starts_at?: string | null;
          ends_at?: string | null;
          capacity_override?: number | null;
          is_closed?: boolean;
          reason?: string | null;
          created_by_user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          service_id?: string | null;
          availability_rule_id?: string | null;
          exception_date?: string;
          starts_at?: string | null;
          ends_at?: string | null;
          capacity_override?: number | null;
          is_closed?: boolean;
          reason?: string | null;
          created_by_user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      provider_documents: {
        Row: {
          id: string;
          organization_id: string;
          created_by_user_id: string;
          title: string;
          document_type: ProviderApprovalDocumentType;
          file_name: string;
          storage_bucket: string;
          storage_path: string;
          mime_type: string | null;
          file_size_bytes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          created_by_user_id: string;
          title: string;
          document_type: ProviderApprovalDocumentType;
          file_name: string;
          storage_bucket?: string;
          storage_path: string;
          mime_type?: string | null;
          file_size_bytes: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          created_by_user_id?: string;
          title?: string;
          document_type?: ProviderApprovalDocumentType;
          file_name?: string;
          storage_bucket?: string;
          storage_path?: string;
          mime_type?: string | null;
          file_size_bytes?: number;
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
      is_platform_admin: {
        Args: {
          target_user_id?: string;
        };
        Returns: boolean;
      };
      create_household: {
        Args: {
          next_name: string;
        };
        Returns: Database["public"]["Tables"]["households"]["Row"];
      };
      invite_household_member: {
        Args: {
          target_household_id: string;
          invitee_email: string;
          next_permissions: HouseholdPermission[];
        };
        Returns: Database["public"]["Tables"]["household_invitations"]["Row"];
      };
      accept_household_invitation: {
        Args: {
          target_invitation_id: string;
        };
        Returns: Database["public"]["Tables"]["household_invitations"]["Row"];
      };
      reject_household_invitation: {
        Args: {
          target_invitation_id: string;
        };
        Returns: Database["public"]["Tables"]["household_invitations"]["Row"];
      };
      update_household_member_permissions: {
        Args: {
          target_household_id: string;
          target_member_id: string;
          next_permissions: HouseholdPermission[];
        };
        Returns: Database["public"]["Tables"]["household_members"]["Row"];
      };
      get_household_member_profiles: {
        Args: {
          target_household_id: string;
        };
        Returns: Array<{
          id: string;
          email: string;
          first_name: string;
          last_name: string;
        }>;
      };
      create_pet: {
        Args: {
          target_household_id: string;
          next_name: string;
          next_species: string;
          next_breed: string | null;
          next_sex: PetSex;
          next_birth_date: string | null;
          next_notes: string | null;
        };
        Returns: Database["public"]["Tables"]["pets"]["Row"];
      };
      update_pet: {
        Args: {
          target_pet_id: string;
          next_name: string;
          next_species: string;
          next_breed: string | null;
          next_sex: PetSex;
          next_birth_date: string | null;
          next_notes: string | null;
        };
        Returns: Database["public"]["Tables"]["pets"]["Row"];
      };
      set_pet_avatar: {
        Args: {
          target_pet_id: string;
          next_avatar_storage_bucket: string;
          next_avatar_storage_path: string;
        };
        Returns: Database["public"]["Tables"]["pet_profiles"]["Row"];
      };
      set_pet_memory_status: {
        Args: {
          target_pet_id: string;
          next_status: PetStatus;
        };
        Returns: Database["public"]["Tables"]["pets"]["Row"];
      };
      ensure_pet_is_bookable: {
        Args: {
          target_pet_id: string;
        };
        Returns: void;
      };
      create_pet_vaccine: {
        Args: {
          target_pet_id: string;
          next_name: string;
          next_administered_on: string;
          next_due_on: string | null;
          next_notes: string | null;
        };
        Returns: Database["public"]["Tables"]["pet_vaccines"]["Row"];
      };
      update_pet_vaccine: {
        Args: {
          target_vaccine_id: string;
          next_name: string;
          next_administered_on: string;
          next_due_on: string | null;
          next_notes: string | null;
        };
        Returns: Database["public"]["Tables"]["pet_vaccines"]["Row"];
      };
      create_pet_allergy: {
        Args: {
          target_pet_id: string;
          next_allergen: string;
          next_reaction: string | null;
          next_notes: string | null;
        };
        Returns: Database["public"]["Tables"]["pet_allergies"]["Row"];
      };
      update_pet_allergy: {
        Args: {
          target_allergy_id: string;
          next_allergen: string;
          next_reaction: string | null;
          next_notes: string | null;
        };
        Returns: Database["public"]["Tables"]["pet_allergies"]["Row"];
      };
      create_pet_condition: {
        Args: {
          target_pet_id: string;
          next_name: string;
          next_status: PetConditionStatus;
          next_diagnosed_on: string | null;
          next_is_critical: boolean;
          next_notes: string | null;
        };
        Returns: Database["public"]["Tables"]["pet_conditions"]["Row"];
      };
      update_pet_condition: {
        Args: {
          target_condition_id: string;
          next_name: string;
          next_status: PetConditionStatus;
          next_diagnosed_on: string | null;
          next_is_critical: boolean;
          next_notes: string | null;
        };
        Returns: Database["public"]["Tables"]["pet_conditions"]["Row"];
      };
      create_reminder: {
        Args: {
          target_household_id: string;
          target_pet_id: string | null;
          next_title: string | null;
          next_due_at: string | null;
          next_notes: string | null;
        };
        Returns: Database["public"]["Tables"]["reminders"]["Row"];
      };
      complete_reminder: {
        Args: {
          target_reminder_id: string;
        };
        Returns: Database["public"]["Tables"]["reminders"]["Row"];
      };
      snooze_reminder: {
        Args: {
          target_reminder_id: string;
          next_due_at: string;
        };
        Returns: Database["public"]["Tables"]["reminders"]["Row"];
      };
      has_provider_role: {
        Args: {
          target_user_id?: string;
        };
        Returns: boolean;
      };
      can_manage_provider_organization: {
        Args: {
          target_organization_id: string;
          target_user_id?: string;
        };
        Returns: boolean;
      };
      is_provider_organization_visible: {
        Args: {
          target_organization_id: string;
        };
        Returns: boolean;
      };
      can_view_provider_organization: {
        Args: {
          target_organization_id: string;
          target_user_id?: string;
        };
        Returns: boolean;
      };
      extract_provider_organization_id_from_storage_path: {
        Args: {
          object_name: string;
        };
        Returns: string | null;
      };
      create_provider_organization: {
        Args: {
          next_name: string;
          next_slug: string;
          next_city: string;
          next_country_code?: string;
          next_is_public?: boolean;
        };
        Returns: Database["public"]["Tables"]["provider_organizations"]["Row"];
      };
      update_provider_organization: {
        Args: {
          target_organization_id: string;
          next_name: string;
          next_slug: string;
          next_city: string;
          next_country_code?: string;
          next_is_public?: boolean;
        };
        Returns: Database["public"]["Tables"]["provider_organizations"]["Row"];
      };
      upsert_provider_public_profile: {
        Args: {
          target_organization_id: string;
          next_headline: string;
          next_bio: string;
          next_avatar_url?: string | null;
          next_is_public?: boolean;
        };
        Returns: Database["public"]["Tables"]["provider_public_profiles"]["Row"];
      };
      set_provider_public_profile_avatar: {
        Args: {
          target_organization_id: string;
          next_avatar_storage_bucket: string;
          next_avatar_storage_path: string;
        };
        Returns: Database["public"]["Tables"]["provider_public_profiles"]["Row"];
      };
      create_provider_service: {
        Args: {
          target_organization_id: string;
          next_name: string;
          next_category: string;
          next_short_description?: string | null;
          next_species_served?: string[];
          next_duration_minutes?: number | null;
          next_is_public?: boolean;
          next_booking_mode?: BookingMode;
          next_base_price_cents?: number;
          next_currency_code?: string;
          next_cancellation_window_hours?: number;
        };
        Returns: Database["public"]["Tables"]["provider_services"]["Row"];
      };
      update_provider_service: {
        Args: {
          target_service_id: string;
          next_name: string;
          next_category: string;
          next_short_description?: string | null;
          next_species_served?: string[];
          next_duration_minutes?: number | null;
          next_is_public?: boolean;
          next_is_active?: boolean;
          next_booking_mode?: BookingMode;
          next_base_price_cents?: number;
          next_currency_code?: string;
          next_cancellation_window_hours?: number;
        };
        Returns: Database["public"]["Tables"]["provider_services"]["Row"];
      };
      add_provider_availability_slot: {
        Args: {
          target_organization_id: string;
          next_day_of_week: number;
          next_starts_at: string;
          next_ends_at: string;
          next_is_active?: boolean;
        };
        Returns: Database["public"]["Tables"]["provider_availability"]["Row"];
      };
      update_provider_availability_slot: {
        Args: {
          target_availability_id: string;
          next_day_of_week: number;
          next_starts_at: string;
          next_ends_at: string;
          next_is_active?: boolean;
        };
        Returns: Database["public"]["Tables"]["provider_availability"]["Row"];
      };
      approve_provider_organization: {
        Args: {
          target_organization_id: string;
        };
        Returns: Database["public"]["Tables"]["provider_organizations"]["Row"];
      };
      reject_provider_organization: {
        Args: {
          target_organization_id: string;
        };
        Returns: Database["public"]["Tables"]["provider_organizations"]["Row"];
      };
      insert_audit_log: {
        Args: {
          target_entity_type: string;
          target_entity_id: string;
          next_action: string;
          next_context?: unknown;
          target_actor_user_id?: string;
        };
        Returns: Database["public"]["Tables"]["audit_logs"]["Row"];
      };
      preview_booking: {
        Args: {
          target_household_id: string;
          target_pet_id: string;
          target_provider_organization_id: string;
          target_provider_service_id: string;
          target_payment_method_id?: string | null;
        };
        Returns: {
          household_id: string;
          pet_id: string;
          provider_organization_id: string;
          provider_service_id: string;
          selected_payment_method_id: string | null;
          booking_mode: BookingMode;
          status_on_create: BookingStatus;
          scheduled_start_at: string;
          scheduled_end_at: string;
          cancellation_deadline_at: string;
          cancellation_window_hours: number;
          currency_code: string;
          unit_price_cents: number;
          subtotal_price_cents: number;
          total_price_cents: number;
          household_name: string;
          pet_name: string;
          provider_name: string;
          service_name: string;
          service_duration_minutes: number | null;
          payment_method_brand: string | null;
          payment_method_last_4: string | null;
        }[];
      };
      create_booking: {
        Args: {
          target_household_id: string;
          target_pet_id: string;
          target_provider_organization_id: string;
          target_provider_service_id: string;
          target_payment_method_id?: string | null;
        };
        Returns: Database["public"]["Tables"]["bookings"]["Row"];
      };
      get_service_booking_slots: {
        Args: {
          target_service_id: string;
          from_date: string;
          to_date: string;
        };
        Returns: {
          availability_rule_id: string;
          organization_id: string;
          service_id: string;
          slot_date: string;
          slot_start_at: string;
          slot_end_at: string;
          capacity_total: number;
          reserved_count: number;
          available_count: number;
          status: BookingSlotStatus;
        }[];
      };
      create_booking_from_slot: {
        Args: {
          target_household_id: string;
          target_pet_id: string;
          target_provider_service_id: string;
          target_slot_start_at: string;
          target_slot_end_at: string;
          target_availability_rule_id: string;
          target_payment_method_id?: string | null;
        };
        Returns: Database["public"]["Tables"]["bookings"]["Row"];
      };
      approve_booking: {
        Args: {
          target_booking_id: string;
        };
        Returns: Database["public"]["Tables"]["bookings"]["Row"];
      };
      reject_booking: {
        Args: {
          target_booking_id: string;
          next_reason?: string | null;
        };
        Returns: Database["public"]["Tables"]["bookings"]["Row"];
      };
      cancel_booking: {
        Args: {
          target_booking_id: string;
          next_reason?: string | null;
        };
        Returns: Database["public"]["Tables"]["bookings"]["Row"];
      };
      can_create_support_case: {
        Args: {
          target_booking_id: string;
          target_user_id?: string;
        };
        Returns: boolean;
      };
      create_support_case: {
        Args: {
          target_booking_id: string;
          next_subject: string;
          next_description_text: string;
        };
        Returns: Database["public"]["Tables"]["support_cases"]["Row"];
      };
      update_support_case_admin: {
        Args: {
          target_case_id: string;
          next_status: SupportCaseStatus;
          next_admin_note?: string | null;
          next_resolution_text?: string | null;
        };
        Returns: Database["public"]["Tables"]["support_cases"]["Row"];
      };
      can_complete_booking: {
        Args: {
          target_booking_id: string;
          target_user_id?: string;
        };
        Returns: boolean;
      };
      complete_booking: {
        Args: {
          target_booking_id: string;
        };
        Returns: Database["public"]["Tables"]["bookings"]["Row"];
      };
      create_booking_operation_token: {
        Args: {
          target_booking_id: string;
          target_operation_type: "check_in" | "check_out";
        };
        Returns: Array<{
          token: string;
          token_preview: string | null;
          expires_at: string;
          operation_type: "check_in" | "check_out";
          booking_id: string;
        }>;
      };
      consume_booking_operation_token: {
        Args: {
          raw_token: string;
        };
        Returns: Array<{
          success: boolean;
          booking_id: string;
          operation_type: "check_in" | "check_out";
          operation_id: string;
          used_at: string;
        }>;
      };
      revoke_booking_operation_token: {
        Args: {
          target_token_id: string;
        };
        Returns: Array<{
          token_id: string;
          booking_id: string;
          operation_type: "check_in" | "check_out";
          status: "active" | "used" | "expired" | "revoked";
          revoked_at: string;
        }>;
      };
      can_view_chat_thread: {
        Args: {
          target_thread_id: string;
          target_user_id?: string;
        };
        Returns: boolean;
      };
      upsert_booking_chat_thread_from_booking: {
        Args: {
          target_booking_id: string;
        };
        Returns: Database["public"]["Tables"]["chat_threads"]["Row"];
      };
      send_chat_message: {
        Args: {
          target_thread_id: string;
          next_message_text: string;
        };
        Returns: Database["public"]["Tables"]["chat_messages"]["Row"];
      };
      can_review_booking: {
        Args: {
          target_booking_id: string;
          target_user_id?: string;
        };
        Returns: boolean;
      };
      create_review: {
        Args: {
          target_booking_id: string;
          next_rating: number;
          next_comment_text: string;
        };
        Returns: Database["public"]["Tables"]["reviews"]["Row"];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
