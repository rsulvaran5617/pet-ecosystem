import type { BookingMode } from "./bookings";
import type { TimestampedEntity, Uuid } from "./base";
import type {
  ProviderApprovalStatus,
  ProviderAvailabilitySlot,
  ProviderOrganization,
  ProviderPublicProfile,
  ProviderService,
  ProviderServiceCategory
} from "./marketplace";

export type ProviderApprovalDocumentType = "identity" | "license" | "insurance" | "permit" | "other";

export interface ProviderApprovalDocument extends TimestampedEntity {
  id: Uuid;
  organizationId: Uuid;
  createdByUserId: Uuid;
  title: string;
  documentType: ProviderApprovalDocumentType;
  fileName: string;
  storageBucket: string;
  storagePath: string;
  mimeType: string | null;
  fileSizeBytes: number;
}

export interface ProviderOrganizationDetail {
  organization: ProviderOrganization;
  publicProfile: ProviderPublicProfile | null;
  services: ProviderService[];
  availability: ProviderAvailabilitySlot[];
  approvalDocuments: ProviderApprovalDocument[];
}

export interface CreateProviderOrganizationInput {
  name: string;
  slug: string;
  city: string;
  countryCode?: string;
  isPublic?: boolean;
}

export interface UpdateProviderOrganizationInput {
  name: string;
  slug: string;
  city: string;
  countryCode?: string;
  isPublic?: boolean;
}

export interface UpsertProviderPublicProfileInput {
  headline: string;
  bio: string;
  avatarUrl?: string | null;
  isPublic?: boolean;
}

export interface CreateProviderServiceInput {
  organizationId: Uuid;
  name: string;
  category: ProviderServiceCategory;
  shortDescription?: string | null;
  speciesServed?: string[];
  durationMinutes?: number | null;
  bookingMode?: BookingMode;
  basePriceCents?: number;
  currencyCode?: string;
  cancellationWindowHours?: number;
  isPublic?: boolean;
}

export interface UpdateProviderServiceInput {
  name: string;
  category: ProviderServiceCategory;
  shortDescription?: string | null;
  speciesServed?: string[];
  durationMinutes?: number | null;
  bookingMode?: BookingMode;
  basePriceCents?: number;
  currencyCode?: string;
  cancellationWindowHours?: number;
  isPublic?: boolean;
  isActive?: boolean;
}

export interface CreateProviderAvailabilityInput {
  organizationId: Uuid;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startsAt: string;
  endsAt: string;
  isActive?: boolean;
}

export interface UpdateProviderAvailabilityInput {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startsAt: string;
  endsAt: string;
  isActive?: boolean;
}

export interface UploadProviderApprovalDocumentInput {
  title: string;
  documentType: ProviderApprovalDocumentType;
  fileName: string;
  mimeType?: string | null;
  fileBytes: ArrayBuffer;
}

export interface ProviderApprovalStatusSnapshot {
  organizationId: Uuid;
  approvalStatus: ProviderApprovalStatus;
  isPublic: boolean;
}
