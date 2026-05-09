import type {
  AddOperationNoteInput,
  BookingCheckIn,
  BookingCheckOut,
  BookingEvidence,
  BookingOperationNote,
  BookingOperationTokenResult,
  BookingOperationType,
  BookingOperationsTimeline,
  BookingReportCard,
  ConsumeBookingOperationTokenResult,
  CreateCheckInInput,
  Database,
  RevokeBookingOperationTokenResult,
  UpsertReportCardInput,
  UploadEvidenceInput,
  Uuid
} from "@pet/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type OperationsSupabaseClient = SupabaseClient<Database>;
type BookingOperationRow = Database["public"]["Tables"]["booking_operations"]["Row"];
type BookingOperationEvidenceRow = Database["public"]["Tables"]["booking_operation_evidence"]["Row"];
type BookingOperationReportRow = Database["public"]["Tables"]["booking_operation_report"]["Row"];
type BookingOperationNoteRow = Database["public"]["Tables"]["booking_operation_notes"]["Row"];
const bookingOperationEvidenceBucketId = "booking-operation-evidence";

export interface BookingOperationsApiClient {
  createCheckIn(bookingId: Uuid, input: CreateCheckInInput): Promise<BookingCheckIn>;
  createCheckOut(bookingId: Uuid): Promise<BookingCheckOut>;
  createBookingOperationToken(bookingId: Uuid, operationType: BookingOperationType): Promise<BookingOperationTokenResult>;
  consumeBookingOperationToken(rawToken: string): Promise<ConsumeBookingOperationTokenResult>;
  revokeBookingOperationToken(tokenId: Uuid): Promise<RevokeBookingOperationTokenResult>;
  uploadEvidence(bookingId: Uuid, input: UploadEvidenceInput): Promise<BookingEvidence>;
  upsertReportCard(bookingId: Uuid, input: UpsertReportCardInput): Promise<BookingReportCard>;
  addOperationNote(bookingId: Uuid, input: AddOperationNoteInput): Promise<BookingOperationNote>;
  getBookingOperations(bookingId: Uuid): Promise<BookingOperationsTimeline>;
}

function fail(error: { message: string } | null, fallbackMessage: string): never {
  if (error) {
    throw new Error(error.message);
  }
  throw new Error(fallbackMessage);
}

function failEvidenceUploadStep(error: { message: string } | null, fallbackMessage: string): never {
  const detail = error?.message ? ` Detalle: ${error.message}` : "";

  throw new Error(`${fallbackMessage}${detail}`);
}

function mapCheckIn(row: BookingOperationRow): BookingCheckIn {
  if (row.operation_type !== "check_in") {
    throw new Error("Invalid operation type for check-in");
  }
  return {
    id: row.id,
    bookingId: row.booking_id,
    operationType: "check_in",
    createdByUserId: row.created_by_user_id,
    locationLatitude: row.location_latitude as number | null,
    locationLongitude: row.location_longitude as number | null,
    locationLabel: row.location_label,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapCheckOut(row: BookingOperationRow): BookingCheckOut {
  if (row.operation_type !== "check_out") {
    throw new Error("Invalid operation type for check-out");
  }
  return {
    id: row.id,
    bookingId: row.booking_id,
    operationType: "check_out",
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapEvidence(row: BookingOperationEvidenceRow): BookingEvidence {
  return {
    id: row.id,
    bookingId: row.booking_id,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    fileName: row.file_name,
    fileSizeBytes: row.file_size_bytes,
    mimeType: row.mime_type,
    uploadedByUserId: row.uploaded_by_user_id,
    createdAt: row.created_at
  };
}

function mapReportCard(row: BookingOperationReportRow): BookingReportCard {
  return {
    id: row.id,
    bookingId: row.booking_id,
    reportText: row.report_text,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapOperationNote(row: BookingOperationNoteRow): BookingOperationNote {
  return {
    id: row.id,
    bookingId: row.booking_id,
    noteText: row.note_text,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapOperationTokenResult(
  row: Database["public"]["Functions"]["create_booking_operation_token"]["Returns"][number]
): BookingOperationTokenResult {
  return {
    token: row.token,
    tokenPreview: row.token_preview,
    expiresAt: row.expires_at,
    operationType: row.operation_type,
    bookingId: row.booking_id
  };
}

function mapRevokeOperationTokenResult(
  row: Database["public"]["Functions"]["revoke_booking_operation_token"]["Returns"][number]
): RevokeBookingOperationTokenResult {
  return {
    tokenId: row.token_id,
    bookingId: row.booking_id,
    operationType: row.operation_type,
    status: row.status,
    revokedAt: row.revoked_at
  };
}

function mapConsumeOperationTokenResult(
  row: Database["public"]["Functions"]["consume_booking_operation_token"]["Returns"][number]
): ConsumeBookingOperationTokenResult {
  return {
    success: row.success,
    bookingId: row.booking_id,
    operationType: row.operation_type,
    operationId: row.operation_id,
    usedAt: row.used_at
  };
}

async function getCurrentUser(supabase: OperationsSupabaseClient) {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    fail(error, "Unable to resolve the current auth user.");
  }

  if (!data.user) {
    throw new Error("Authenticated user required.");
  }

  return data.user;
}

function sanitizeFileName(fileName: string) {
  const trimmedFileName = fileName.trim() || "evidencia";

  return trimmedFileName.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "evidencia";
}

function buildEvidenceStoragePath(bookingId: Uuid, fileName: string) {
  const randomSuffix = Math.random().toString(36).slice(2, 10);

  return `${bookingId}/${Date.now()}-${randomSuffix}-${sanitizeFileName(fileName)}`;
}

export function createBookingOperationsApiClient(
  supabase: OperationsSupabaseClient
): BookingOperationsApiClient {
  return {
    async createCheckIn(bookingId, input) {
      const user = await getCurrentUser(supabase);
      const { data, error } = await supabase
        .from("booking_operations")
        .insert({
          booking_id: bookingId,
          operation_type: "check_in",
          created_by_user_id: user.id,
          location_latitude: input.locationLatitude ?? null,
          location_longitude: input.locationLongitude ?? null,
          location_label: input.locationLabel ?? null
        })
        .select("*")
        .single();

      if (error) {
        fail(error, "Unable to create check-in for booking.");
      }

      return mapCheckIn(data as BookingOperationRow);
    },

    async createCheckOut(bookingId) {
      const user = await getCurrentUser(supabase);
      const { data, error } = await supabase
        .from("booking_operations")
        .insert({
          booking_id: bookingId,
          operation_type: "check_out",
          created_by_user_id: user.id
        })
        .select("*")
        .single();

      if (error) {
        fail(error, "Unable to create check-out for booking.");
      }

      return mapCheckOut(data as BookingOperationRow);
    },

    async createBookingOperationToken(bookingId, operationType) {
      const { data, error } = await supabase.rpc("create_booking_operation_token", {
        target_booking_id: bookingId,
        target_operation_type: operationType
      });

      if (error) {
        fail(error, "Unable to create booking operation QR token.");
      }

      const row = data?.[0];

      if (!row) {
        throw new Error("Booking operation QR token response was empty.");
      }

      return mapOperationTokenResult(row);
    },

    async consumeBookingOperationToken(rawToken) {
      const { data, error } = await supabase.rpc("consume_booking_operation_token", {
        raw_token: rawToken
      });

      if (error) {
        fail(error, "Unable to consume booking operation QR token.");
      }

      const row = data?.[0];

      if (!row) {
        throw new Error("Booking operation QR consume response was empty.");
      }

      return mapConsumeOperationTokenResult(row);
    },

    async revokeBookingOperationToken(tokenId) {
      const { data, error } = await supabase.rpc("revoke_booking_operation_token", {
        target_token_id: tokenId
      });

      if (error) {
        fail(error, "Unable to revoke booking operation QR token.");
      }

      const row = data?.[0];

      if (!row) {
        throw new Error("Booking operation QR token revoke response was empty.");
      }

      return mapRevokeOperationTokenResult(row);
    },

    async uploadEvidence(bookingId, input) {
      const user = await getCurrentUser(supabase);
      const fileSizeBytes = input.fileBytes.byteLength;

      if (fileSizeBytes === 0) {
        throw new Error("El documento de evidencia esta vacio.");
      }

      // Validate file size (max 50MB)
      const maxFileSizeBytes = 50 * 1024 * 1024;
      if (fileSizeBytes > maxFileSizeBytes) {
        throw new Error("El documento de evidencia supera el maximo permitido de 50 MB.");
      }

      // Validate evidence count (max 5)
      const { data: existingEvidences, error: countError } = await supabase
        .from("booking_operation_evidence")
        .select("id")
        .eq("booking_id", bookingId);

      if (countError) {
        failEvidenceUploadStep(countError, "No se pudo consultar la evidencia documental existente.");
      }

      if ((existingEvidences?.length ?? 0) >= 5) {
        throw new Error("Esta reserva ya tiene el maximo permitido de 5 documentos de evidencia.");
      }

      const storageBucket = input.storageBucket ?? bookingOperationEvidenceBucketId;
      const storagePath = buildEvidenceStoragePath(bookingId, input.fileName);
      const uploadPayload = new Uint8Array(input.fileBytes);
      const { error: uploadError } = await supabase.storage.from(storageBucket).upload(storagePath, uploadPayload, {
        contentType: input.mimeType ?? undefined,
        upsert: false
      });

      if (uploadError) {
        failEvidenceUploadStep(uploadError, "No se pudo subir el documento al bucket privado de evidencia.");
      }

      const evidenceMetadata = {
        booking_id: bookingId,
        storage_bucket: storageBucket,
        storage_path: storagePath,
        // Compatibilidad con ambientes remotos que aun tienen file_url legacy NOT NULL.
        file_url: storagePath,
        file_name: input.fileName,
        file_size_bytes: fileSizeBytes,
        mime_type: input.mimeType ?? null,
        uploaded_by_user_id: user.id
      };

      const { data, error } = await supabase
        .from("booking_operation_evidence")
        .insert(evidenceMetadata)
        .select("*")
        .single();

      if (error) {
        await supabase.storage.from(storageBucket).remove([storagePath]).catch(() => undefined);
        failEvidenceUploadStep(
          error,
          `No se pudo registrar la metadata de evidencia documental con file_url legacy incluido (${storagePath}).`
        );
      }

      return mapEvidence(data as BookingOperationEvidenceRow);
    },

    async upsertReportCard(bookingId, input) {
      // Validate report text length (max 500 chars)
      if (input.reportText.length > 500) {
        throw new Error("Report text exceeds maximum length (500 characters).");
      }

      // Check if report exists
      const { data: existing, error: existingError } = await supabase
        .from("booking_operation_report")
        .select("id")
        .eq("booking_id", bookingId)
        .maybeSingle();

      if (existingError) {
        fail(existingError, "Unable to check existing report card.");
      }

      const { data, error } = existing
        ? await supabase
            .from("booking_operation_report")
            .update({
              report_text: input.reportText,
              updated_at: new Date().toISOString()
            })
            .eq("booking_id", bookingId)
            .select("*")
            .single()
        : await supabase
            .from("booking_operation_report")
            .insert({
              booking_id: bookingId,
              report_text: input.reportText,
              created_by_user_id: (await getCurrentUser(supabase)).id
            })
            .select("*")
            .single();

      if (error) {
        fail(error, "Unable to save report card for booking.");
      }

      return mapReportCard(data as BookingOperationReportRow);
    },

    async addOperationNote(bookingId, input) {
      // Validate note text length (max 1000 chars)
      if (input.noteText.length === 0 || input.noteText.length > 1000) {
        throw new Error("Note text must be 1-1000 characters.");
      }

      const user = await getCurrentUser(supabase);
      const { data, error } = await supabase
        .from("booking_operation_notes")
        .insert({
          booking_id: bookingId,
          note_text: input.noteText,
          created_by_user_id: user.id
        })
        .select("*")
        .single();

      if (error) {
        fail(error, "Unable to add operation note.");
      }

      return mapOperationNote(data as BookingOperationNoteRow);
    },

    async getBookingOperations(bookingId) {
      // Fetch all operations data in parallel
      const [
        { data: checkInData, error: checkInError },
        { data: checkOutData, error: checkOutError },
        { data: evidenceData, error: evidenceError },
        { data: reportData, error: reportError },
        { data: notesData, error: notesError }
      ] = await Promise.all([
        supabase
          .from("booking_operations")
          .select("*")
          .eq("booking_id", bookingId)
          .eq("operation_type", "check_in")
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("booking_operations")
          .select("*")
          .eq("booking_id", bookingId)
          .eq("operation_type", "check_out")
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("booking_operation_evidence")
          .select("*")
          .eq("booking_id", bookingId)
          .order("created_at", { ascending: false }),
        supabase
          .from("booking_operation_report")
          .select("*")
          .eq("booking_id", bookingId)
          .maybeSingle(),
        supabase
          .from("booking_operation_notes")
          .select("*")
          .eq("booking_id", bookingId)
          .order("created_at", { ascending: true })
      ]);

      if (checkInError) fail(checkInError, "Unable to fetch check-in.");
      if (checkOutError) fail(checkOutError, "Unable to fetch check-out.");
      if (evidenceError) fail(evidenceError, "Unable to fetch evidence.");
      if (reportError) fail(reportError, "Unable to fetch report card.");
      if (notesError) fail(notesError, "Unable to fetch operation notes.");

      const checkIn = checkInData && checkInData.length > 0 ? mapCheckIn(checkInData[0] as BookingOperationRow) : null;
      const checkOut = checkOutData && checkOutData.length > 0 ? mapCheckOut(checkOutData[0] as BookingOperationRow) : null;
      const evidences = (evidenceData ?? []).map((row) => mapEvidence(row as BookingOperationEvidenceRow));
      const reportCard = reportData ? mapReportCard(reportData as BookingOperationReportRow) : null;
      const notes = (notesData ?? []).map((row) => mapOperationNote(row as BookingOperationNoteRow));

      // Determine operational state
      let operationalState: "pending" | "checked_in" | "checked_out" | "evidence_pending" | "documented";
      if (!checkIn) {
        operationalState = "pending";
      } else if (!checkOut) {
        operationalState = "checked_in";
      } else if (evidences.length === 0) {
        operationalState = "evidence_pending";
      } else {
        operationalState = "documented";
      }

      return {
        bookingId,
        operationalState,
        checkIn,
        checkOut,
        evidences,
        reportCard,
        notes
      };
    }
  };
}
