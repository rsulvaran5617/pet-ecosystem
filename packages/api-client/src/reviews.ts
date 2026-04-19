import type {
  BookingReviewState,
  CreateReviewInput,
  Database,
  Review,
  ReviewRating,
  Uuid
} from "@pet/types";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createBookingsApiClient } from "./bookings";

type ReviewsSupabaseClient = SupabaseClient<Database>;
type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];

export interface ReviewsApiClient {
  getBookingReviewState(bookingId: Uuid): Promise<BookingReviewState>;
  createReview(input: CreateReviewInput): Promise<Review>;
}

function fail(error: { message: string } | null, fallbackMessage: string): never {
  if (error) {
    throw new Error(error.message);
  }

  throw new Error(fallbackMessage);
}

function mapReview(row: ReviewRow): Review {
  return {
    id: row.id,
    bookingId: row.booking_id,
    householdId: row.household_id,
    petId: row.pet_id,
    providerOrganizationId: row.provider_organization_id,
    providerServiceId: row.provider_service_id,
    reviewerUserId: row.reviewer_user_id,
    rating: row.rating as ReviewRating,
    commentText: row.comment_text,
    createdAt: row.created_at
  };
}

function getIneligibleReason(status: string, hasReview: boolean) {
  if (hasReview) {
    return "This booking already has a submitted review.";
  }

  if (status === "pending_approval") {
    return "Only completed bookings can be reviewed.";
  }

  if (status === "confirmed") {
    return "This booking still needs to be completed before you can review it.";
  }

  if (status === "cancelled") {
    return "Cancelled bookings cannot be reviewed.";
  }

  return "You are not eligible to review this booking.";
}

export function createReviewsApiClient(supabase: ReviewsSupabaseClient): ReviewsApiClient {
  const bookings = createBookingsApiClient(supabase);

  return {
    async getBookingReviewState(bookingId) {
      const [bookingDetail, existingReview, canReview] = await Promise.all([
        bookings.getBookingDetail(bookingId),
        supabase.from("reviews").select("*").eq("booking_id", bookingId).maybeSingle(),
        supabase.rpc("can_review_booking", {
          target_booking_id: bookingId
        })
      ]);

      if (existingReview.error) {
        fail(existingReview.error, "Unable to load the booking review.");
      }

      if (canReview.error) {
        fail(canReview.error, "Unable to resolve review eligibility.");
      }

      const review = existingReview.data ? mapReview(existingReview.data) : null;
      const isEligible = Boolean(canReview.data);

      return {
        bookingId: bookingDetail.booking.id,
        providerOrganizationId: bookingDetail.booking.providerOrganizationId,
        providerServiceId: bookingDetail.booking.providerServiceId,
        householdId: bookingDetail.booking.householdId,
        petId: bookingDetail.booking.petId,
        bookingStatus: bookingDetail.booking.status,
        scheduledEndAt: bookingDetail.booking.scheduledEndAt,
        providerName: bookingDetail.booking.providerName,
        serviceName: bookingDetail.booking.serviceName,
        petName: bookingDetail.booking.petName,
        isEligible,
        eligibilityReason: isEligible ? null : getIneligibleReason(bookingDetail.booking.status, Boolean(review)),
        review
      };
    },
    async createReview(input) {
      const { data, error } = await supabase.rpc("create_review", {
        target_booking_id: input.bookingId,
        next_rating: input.rating,
        next_comment_text: input.commentText
      });

      if (error) {
        fail(error, "Unable to create the review.");
      }

      return mapReview(data);
    }
  };
}
