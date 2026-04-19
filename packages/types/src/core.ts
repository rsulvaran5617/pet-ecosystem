import type { IsoDateString, TimestampedEntity, Uuid } from "./base";

export type CoreRole = "pet_owner" | "provider" | "admin";
export type VerificationChannel = "email";
export type VerificationStatus = "pending" | "verified";
export type AddressLabel = "home" | "work" | "other";
export type PaymentMethodType = "card";
export type PaymentMethodBrand = "visa" | "mastercard" | "amex";
export type PaymentMethodStatus = "active" | "disabled";
export type OnboardingTaskId =
  | "create_account"
  | "verify_contact"
  | "complete_profile"
  | "select_role"
  | "set_preferences"
  | "add_address"
  | "add_payment_method";
export type OnboardingTaskStatus = "pending" | "completed";

export interface UserProfile extends TimestampedEntity {
  id: Uuid;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  locale: string;
}

export interface UserPreferences {
  marketingOptIn: boolean;
  reminderEmailOptIn: boolean;
  reminderPushOptIn: boolean;
}

export interface UserRoleAssignment extends TimestampedEntity {
  id: Uuid;
  userId: Uuid;
  role: CoreRole;
  isActive: boolean;
}

export interface UserAddress extends TimestampedEntity {
  id: Uuid;
  userId: Uuid;
  label: AddressLabel;
  recipientName: string;
  line1: string;
  line2?: string | null;
  city: string;
  stateRegion: string;
  postalCode: string;
  countryCode: string;
  isDefault: boolean;
}

export interface UserPaymentMethod extends TimestampedEntity {
  id: Uuid;
  userId: Uuid;
  type: PaymentMethodType;
  brand: PaymentMethodBrand;
  last4: string;
  expMonth: number;
  expYear: number;
  cardholderName: string;
  isDefault: boolean;
  status: PaymentMethodStatus;
}

export interface VerificationSummary {
  channel: VerificationChannel;
  status: VerificationStatus;
  maskedDestination: string;
  lastSentAt?: IsoDateString | null;
}

export interface RecoverySummary {
  enabled: boolean;
  channel: VerificationChannel;
  maskedDestination: string;
  lastRequestedAt?: IsoDateString | null;
}

export interface OnboardingTask {
  id: OnboardingTaskId;
  title: string;
  description: string;
  status: OnboardingTaskStatus;
}

export interface CoreIdentitySnapshot {
  profile: UserProfile;
  preferences: UserPreferences;
  roles: UserRoleAssignment[];
  addresses: UserAddress[];
  paymentMethods: UserPaymentMethod[];
  verification: VerificationSummary;
  recovery: RecoverySummary;
  onboardingTasks: OnboardingTask[];
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  locale?: string;
  emailRedirectTo?: string;
  requestedRoles?: CoreRole[];
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface VerifyOtpInput {
  email: string;
  token: string;
}

export interface RecoverAccessInput {
  email: string;
  redirectTo?: string;
}

export interface CompleteRecoveryInput {
  password: string;
}

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  avatarUrl?: string | null;
  locale?: string;
}

export interface UpdatePreferencesInput {
  marketingOptIn?: boolean;
  reminderEmailOptIn?: boolean;
  reminderPushOptIn?: boolean;
}

export interface UpsertAddressInput {
  id?: Uuid;
  label: AddressLabel;
  recipientName: string;
  line1: string;
  line2?: string | null;
  city: string;
  stateRegion: string;
  postalCode: string;
  countryCode: string;
  isDefault?: boolean;
}

export interface AddPaymentMethodInput {
  brand: PaymentMethodBrand;
  last4: string;
  expMonth: number;
  expYear: number;
  cardholderName: string;
  isDefault?: boolean;
}

export interface SwitchRoleInput {
  role: CoreRole;
}

export interface AuthResult {
  userId: Uuid;
  email: string;
  activeRole: CoreRole;
  emailVerified: boolean;
  verificationRequired: boolean;
}

export interface CoreAuthState {
  isAuthenticated: boolean;
  userId?: Uuid | null;
  email?: string | null;
  emailVerified: boolean;
}
