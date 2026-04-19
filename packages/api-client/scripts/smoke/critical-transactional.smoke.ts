import { createSmokeClientBundle } from "./clients.ts";
import type { SmokeEnv } from "./env.ts";
import { assertSmoke, ensureSavedPaymentMethod, loginAsActor, logoutSafely, writeSmokeArtifact } from "./helpers.ts";

export type CriticalTransactionalMode = "full" | "providers";

export interface CriticalTransactionalResult {
  adminCases: {
    ADM_01: {
      pendingProviderVisible: boolean;
      providerOrganizationId: string;
    };
    ADM_02: {
      approvedStatus: string;
      providerVisibleInMarketplace: boolean;
    };
    ADM_04?: {
      resolvedStatus: string;
      supportCaseId: string;
    };
  };
  manualPreconditions: {
    activeBookingId?: string;
    approvedOrganizationId: string;
    chatThreadId?: string;
    householdId?: string;
    petId?: string;
    providerDisplayName: string;
    supportCaseId?: string;
  };
  mode: CriticalTransactionalMode;
  webCases: {
    WEB_06: {
      providerOrganizationId: string;
      providerSearchQuery: string;
      providerServiceId: string;
      providerVisibleInMarketplace: boolean;
    };
    WEB_07?: {
      activeBookingId: string;
      cancelledBookingId: string;
      detailStatus: string;
      historyCount: number;
      householdId: string;
      paymentMethodId: string;
      petId: string;
      previewStatus: string;
    };
    WEB_08?: {
      lastMessagePreview: string | null;
      messageCount: number;
      threadId: string;
    };
    WEB_09?: {
      bookingId: string;
      completedStatus: string;
      reviewId: string;
      reviewRating: number;
    };
    WEB_10?: {
      customerVisibleStatus: string;
      supportCaseId: string;
    };
  };
}

export async function runCriticalTransactionalSmoke(env: SmokeEnv, mode: CriticalTransactionalMode) {
  const ownerActor = env.actors.owner;
  const providerActor = env.actors.provider;
  const adminActor = env.actors.admin;

  if (mode === "providers") {
    assertSmoke(providerActor && adminActor, "The provider and admin QA actors are required.");
  } else {
    assertSmoke(ownerActor && providerActor && adminActor, "The owner, provider and admin QA actors are required.");
  }

  const requiredProviderActor = providerActor!;
  const requiredAdminActor = adminActor!;

  const providerClients = createSmokeClientBundle(env);
  const customerClients = createSmokeClientBundle(env);
  const adminClients = createSmokeClientBundle(env);
  const publicClients = createSmokeClientBundle(env);

  await Promise.all([
    logoutSafely(providerClients),
    logoutSafely(customerClients),
    logoutSafely(adminClients),
    logoutSafely(publicClients)
  ]);

  await loginAsActor(providerClients, requiredProviderActor, "provider");
  await loginAsActor(adminClients, requiredAdminActor, "admin");

  if (mode !== "providers") {
    await loginAsActor(customerClients, ownerActor!, "pet_owner");
  }

  const timestamp = Date.now();
  const providerName = `Pilot Critical Provider ${timestamp}`;
  const providerSlug = `pilot-critical-provider-${timestamp}`;
  const householdName = `Pilot Critical Household ${timestamp}`;
  const petName = `Pilot Critical Pet ${timestamp}`;
  const customerMessage = `Pilot critical customer message ${timestamp}`;
  const providerMessage = `Pilot critical provider reply ${timestamp}`;
  const reviewComment = `Pilot critical review ${timestamp}`;
  const supportSubject = `Pilot critical support ${timestamp}`;
  const supportDescription = `Pilot critical support description ${timestamp}`;
  const supportResolution = `Pilot critical support resolution ${timestamp}`;

  const organization = await providerClients.providers.createProviderOrganization({
    name: providerName,
    slug: providerSlug,
    city: "Panama City",
    countryCode: "PA",
    isPublic: true
  });

  await providerClients.providers.upsertProviderPublicProfile(organization.id, {
    headline: "Pilot critical provider profile",
    bio: "Provider used for pilot critical web booking, chat, review and support validation.",
    avatarUrl: null,
    isPublic: true
  });

  const service = await providerClients.providers.createProviderService({
    organizationId: organization.id,
    name: "Pilot walk",
    category: "walking",
    shortDescription: "Approval-based validation service for the pilot critical path.",
    speciesServed: ["dog"],
    durationMinutes: 30,
    isPublic: true,
    bookingMode: "approval_required",
    basePriceCents: 2500,
    currencyCode: "USD",
    cancellationWindowHours: 24
  });

  await providerClients.providers.addProviderAvailabilitySlot({
    organizationId: organization.id,
    dayOfWeek: 2,
    startsAt: "09:00",
    endsAt: "12:00",
    isActive: true
  });

  const documentBytes = new TextEncoder().encode(`pilot-permit-${timestamp}`);
  const document = await providerClients.providers.uploadProviderApprovalDocument(organization.id, {
    title: `Pilot permit ${timestamp}`,
    documentType: "permit",
    fileName: "pilot-permit.txt",
    mimeType: "text/plain",
    fileBytes: documentBytes.buffer.slice(documentBytes.byteOffset, documentBytes.byteOffset + documentBytes.byteLength)
  });

  const pendingList = await adminClients.providers.listPendingProviderOrganizations();
  const pendingProvider = pendingList.find((candidate) => candidate.id === organization.id);

  assertSmoke(pendingProvider, "Admin pending list did not expose the pilot critical provider.");

  const adminDetail = await adminClients.providers.getAdminProviderOrganizationDetail(organization.id);

  assertSmoke(
    adminDetail.approvalDocuments.some((candidate) => candidate.id === document.id),
    "Admin detail did not expose the provider approval document."
  );

  const approvedOrganization = await adminClients.providers.approveProviderOrganization(organization.id);

  assertSmoke(approvedOrganization.approvalStatus === "approved", "Admin approval did not move the provider to approved.");

  const marketplaceProviders = await publicClients.marketplace.listMarketplaceProviders({
    query: providerName
  });
  const publicProvider = marketplaceProviders.find((candidate) => candidate.organizationId === organization.id);

  assertSmoke(publicProvider, "The approved provider did not appear in marketplace search.");

  const marketplaceDetail = await publicClients.marketplace.getMarketplaceProvider(organization.id);
  const selectedService = marketplaceDetail.services.find((candidate) => candidate.id === service.id);

  assertSmoke(selectedService, "Marketplace detail did not expose the pilot critical service.");

  if (mode === "providers") {
    const providersResult: CriticalTransactionalResult = {
      mode,
      adminCases: {
        ADM_01: {
          pendingProviderVisible: true,
          providerOrganizationId: organization.id
        },
        ADM_02: {
          approvedStatus: approvedOrganization.approvalStatus,
          providerVisibleInMarketplace: true
        }
      },
      webCases: {
        WEB_06: {
          providerSearchQuery: providerName,
          providerVisibleInMarketplace: true,
          providerOrganizationId: organization.id,
          providerServiceId: service.id
        }
      },
      manualPreconditions: {
        providerDisplayName: providerName,
        approvedOrganizationId: organization.id
      }
    };

    await writeSmokeArtifact(env, "CRITICAL-transactional.json", providersResult);

    return providersResult;
  }

  const household = await customerClients.households.createHousehold({
    name: householdName
  });
  const pet = await customerClients.pets.createPet({
    householdId: household.id,
    name: petName,
    species: "dog",
    breed: "Mixed",
    sex: "unknown",
    notes: "Pilot critical pet."
  });
  const paymentMethodId = await ensureSavedPaymentMethod(customerClients);

  const preview = await customerClients.bookings.previewBooking({
    householdId: household.id,
    petId: pet.id,
    providerId: organization.id,
    serviceId: service.id,
    paymentMethodId
  });

  assertSmoke(preview.statusOnCreate === "pending_approval", "Booking preview did not resolve to pending approval.");
  assertSmoke(preview.paymentMethodSummary?.id === paymentMethodId, "Booking preview did not retain the saved payment method.");

  const activeBooking = await customerClients.bookings.createBooking({
    householdId: household.id,
    petId: pet.id,
    providerId: organization.id,
    serviceId: service.id,
    paymentMethodId
  });

  assertSmoke(activeBooking.booking.status === "pending_approval", "The active booking was not created as pending approval.");

  const providerBookingQueue = await providerClients.bookings.listProviderBookings({
    organizationId: organization.id,
    includeCancelled: true
  });

  assertSmoke(
    providerBookingQueue.some((booking) => booking.id === activeBooking.booking.id && booking.status === "pending_approval"),
    "Provider booking queue did not expose the pending approval booking."
  );

  const approvedBooking = await providerClients.bookings.approveBooking(activeBooking.booking.id);

  assertSmoke(approvedBooking.booking.status === "confirmed", "Provider approval did not move the booking to confirmed.");

  const cancellableBooking = await customerClients.bookings.createBooking({
    householdId: household.id,
    petId: pet.id,
    providerId: organization.id,
    serviceId: service.id,
    paymentMethodId: null
  });

  const cancelledBooking = await customerClients.bookings.cancelBooking(cancellableBooking.booking.id);

  assertSmoke(cancelledBooking.booking.status === "cancelled", "The cancellation path did not move the booking to cancelled.");

  const bookingHistory = await customerClients.bookings.listBookings({
    householdId: household.id,
    includeCancelled: true
  });
  const bookingDetail = await customerClients.bookings.getBookingDetail(activeBooking.booking.id);

  assertSmoke(
    bookingHistory.some((booking) => booking.id === activeBooking.booking.id),
    "Booking history did not include the active booking."
  );
  assertSmoke(bookingDetail.booking.status === "confirmed", "Booking detail did not expose the active booking as confirmed.");

  const thread = await customerClients.messaging.getThreadByBooking(activeBooking.booking.id);

  assertSmoke(thread, "The booking did not create a chat thread.");

  await customerClients.messaging.sendMessage(thread.id, {
    messageText: customerMessage
  });
  await providerClients.messaging.sendMessage(thread.id, {
    messageText: providerMessage
  });

  const threadAfterReply = await customerClients.messaging.getThreadDetail(thread.id);

  assertSmoke(threadAfterReply.messages.length >= 2, "The chat thread did not retain both messages.");

  const completedBooking = await providerClients.bookings.completeBooking(activeBooking.booking.id);

  assertSmoke(completedBooking.booking.status === "completed", "Provider completion did not move the booking to completed.");

  const createdReview = await customerClients.reviews.createReview({
    bookingId: activeBooking.booking.id,
    rating: 5,
    commentText: reviewComment
  });

  assertSmoke(createdReview.commentText === reviewComment, "Review did not persist the expected comment.");

  const supportCase = await customerClients.support.createSupportCase({
    bookingId: activeBooking.booking.id,
    subject: supportSubject,
    descriptionText: supportDescription
  });

  const customerSupportList = await customerClients.support.listMySupportCases();

  assertSmoke(
    customerSupportList.some((candidate) => candidate.id === supportCase.id),
    "Support list did not expose the created case."
  );

  const triagedSupportCase = await adminClients.support.updateSupportCaseAdmin({
    caseId: supportCase.id,
    status: "resolved",
    adminNote: "Pilot critical triage note",
    resolutionText: supportResolution
  });

  assertSmoke(triagedSupportCase.status === "resolved", "Admin triage did not resolve the support case.");

  const customerSupportDetail = await customerClients.support.getSupportCaseDetail(supportCase.id);

  assertSmoke(customerSupportDetail.status === "resolved", "Customer detail did not reflect the resolved support case.");

  const result: CriticalTransactionalResult = {
    mode,
    adminCases: {
      ADM_01: {
        pendingProviderVisible: true,
        providerOrganizationId: organization.id
      },
      ADM_02: {
        approvedStatus: approvedOrganization.approvalStatus,
        providerVisibleInMarketplace: true
      },
      ADM_04: {
        supportCaseId: supportCase.id,
        resolvedStatus: triagedSupportCase.status
      }
    },
    webCases: {
      WEB_06: {
        providerSearchQuery: providerName,
        providerVisibleInMarketplace: true,
        providerOrganizationId: organization.id,
        providerServiceId: service.id
      },
      WEB_07: {
        householdId: household.id,
        petId: pet.id,
        paymentMethodId,
        previewStatus: preview.statusOnCreate,
        activeBookingId: activeBooking.booking.id,
        cancelledBookingId: cancelledBooking.booking.id,
        historyCount: bookingHistory.length,
        detailStatus: bookingDetail.booking.status
      },
      WEB_08: {
        threadId: thread.id,
        messageCount: threadAfterReply.messages.length,
        lastMessagePreview: threadAfterReply.thread.lastMessagePreview
      },
      WEB_09: {
        bookingId: activeBooking.booking.id,
        completedStatus: completedBooking.booking.status,
        reviewId: createdReview.id,
        reviewRating: createdReview.rating
      },
      WEB_10: {
        supportCaseId: supportCase.id,
        customerVisibleStatus: customerSupportDetail.status
      }
    },
    manualPreconditions: {
      providerDisplayName: providerName,
      householdId: household.id,
      petId: pet.id,
      approvedOrganizationId: organization.id,
      activeBookingId: activeBooking.booking.id,
      chatThreadId: thread.id,
      supportCaseId: supportCase.id
    }
  };

  await writeSmokeArtifact(env, "CRITICAL-transactional.json", result);

  return result;
}
