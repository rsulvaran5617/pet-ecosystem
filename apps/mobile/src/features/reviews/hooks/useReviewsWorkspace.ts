import type { BookingReviewState, ReviewRating, Uuid } from "@pet/types";
import { useEffect, useRef, useState } from "react";

import { getMobileReviewsApiClient } from "../../core/services/supabase-mobile";

interface UseReviewsWorkspaceResult {
  reviewState: BookingReviewState | null;
  ratingDraft: ReviewRating;
  commentDraft: string;
  errorMessage: string | null;
  infoMessage: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  clearMessages: () => void;
  refresh: (preferredBookingId?: Uuid | null) => Promise<void>;
  submitReview: () => Promise<void>;
  setCommentDraft: (value: string) => void;
  setRatingDraft: (value: ReviewRating) => void;
}

export function useReviewsWorkspace(
  enabled: boolean,
  focusedBookingId: Uuid | null,
  focusVersion: number
): UseReviewsWorkspaceResult {
  const mountedRef = useRef(true);
  const focusedBookingIdRef = useRef<Uuid | null>(focusedBookingId);
  const [reviewState, setReviewState] = useState<BookingReviewState | null>(null);
  const [ratingDraft, setRatingDraft] = useState<ReviewRating>(5);
  const [commentDraft, setCommentDraft] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadReviewState(bookingId: Uuid) {
    const nextState = await getMobileReviewsApiClient().getBookingReviewState(bookingId);

    if (!mountedRef.current) {
      return nextState;
    }

    setReviewState(nextState);

    if (nextState.review) {
      setRatingDraft(nextState.review.rating);
      setCommentDraft(nextState.review.commentText);
    } else {
      setRatingDraft(5);
      setCommentDraft("");
    }

    return nextState;
  }

  async function refresh(preferredBookingId?: Uuid | null) {
    if (!enabled) {
      if (mountedRef.current) {
        setReviewState(null);
        focusedBookingIdRef.current = null;
        setRatingDraft(5);
        setCommentDraft("");
        setIsLoading(false);
      }

      return;
    }

    const targetBookingId = preferredBookingId ?? focusedBookingIdRef.current;

    if (!targetBookingId) {
      if (mountedRef.current) {
        setReviewState(null);
        setIsLoading(false);
      }

      return;
    }

    setIsLoading(true);

    try {
      await loadReviewState(targetBookingId);
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to load the review state.");
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }

  async function runAction<T>(action: () => Promise<T>, successMessage?: string, refreshAfter = true) {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await action();

      if (refreshAfter) {
        await refresh(focusedBookingIdRef.current);
      }

      if (mountedRef.current) {
        setInfoMessage(successMessage ?? null);
      }

      return result;
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(error instanceof Error ? error.message : "Review action failed.");
      }

      throw error;
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    void refresh();

    return () => {
      mountedRef.current = false;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !focusedBookingId || focusVersion === 0) {
      return;
    }

    focusedBookingIdRef.current = focusedBookingId;
    setErrorMessage(null);
    setInfoMessage("Booking review requested. Loading the review state.");
    void refresh(focusedBookingId);
  }, [enabled, focusedBookingId, focusVersion]);

  return {
    reviewState,
    ratingDraft,
    commentDraft,
    errorMessage,
    infoMessage,
    isLoading,
    isSubmitting,
    clearMessages() {
      setErrorMessage(null);
      setInfoMessage(null);
    },
    refresh,
    async submitReview() {
      const bookingId = focusedBookingIdRef.current;

      if (!bookingId) {
        throw new Error("Choose a completed booking before leaving a review.");
      }

      const normalizedComment = commentDraft.trim();

      if (!normalizedComment) {
        throw new Error("A review comment is required.");
      }

      await runAction(
        () =>
          getMobileReviewsApiClient().createReview({
            bookingId,
            rating: ratingDraft,
            commentText: normalizedComment
          }),
        "Review submitted."
      );
    },
    setCommentDraft,
    setRatingDraft
  };
}
