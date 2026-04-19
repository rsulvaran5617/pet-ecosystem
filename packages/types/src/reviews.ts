import type { BookingStatus } from "./bookings";
import type { IsoDateString, Uuid } from "./base";

export type ReviewRating = 1 | 2 | 3 | 4 | 5;

export interface Review {
  id: Uuid;
  bookingId: Uuid;
  householdId: Uuid;
  petId: Uuid;
  providerOrganizationId: Uuid;
  providerServiceId: Uuid;
  reviewerUserId: Uuid;
  rating: ReviewRating;
  commentText: string;
  createdAt: IsoDateString;
}

export interface BookingReviewState {
  bookingId: Uuid;
  providerOrganizationId: Uuid;
  providerServiceId: Uuid;
  householdId: Uuid;
  petId: Uuid;
  bookingStatus: BookingStatus;
  scheduledEndAt: IsoDateString;
  providerName: string;
  serviceName: string;
  petName: string;
  isEligible: boolean;
  eligibilityReason: string | null;
  review: Review | null;
}

export interface CreateReviewInput {
  bookingId: Uuid;
  rating: ReviewRating;
  commentText: string;
}
