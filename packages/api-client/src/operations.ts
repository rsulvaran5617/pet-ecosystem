import type {
  AddOperationNoteInput,
  BookingCheckIn,
  BookingCheckOut,
  BookingEvidence,
  BookingOperationNote,
  BookingOperationsTimeline,
  BookingReportCard,
  CreateCheckInInput,
  Database,
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

export interface BookingOperationsApiClient {
  createCheckIn(bookingId: Uuid, input: CreateCheckInInput): Promise<BookingCheckIn>;
  createCheckOut(bookingId: Uuid): Promise<BookingCheckOut>;
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

    async uploadEvidence(bookingId, input) {
      // Validate file size (max 50MB)
      const maxFileSizeBytes = 50 * 1024 * 1024;
      if (input.fileSizeBytes > maxFileSizeBytes) {
        throw new Error("File size exceeds maximum allowed (50MB).");
      }

      // Validate evidence count (max 5)
      const { data: existingEvidences, error: countError } = await supabase
        .from("booking_operation_evidence")
        .select("id")
        .eq("booking_id", bookingId);

      if (countError) {
        fail(countError, "Unable to check evidence count.");
      }

      if ((existingEvidences?.length ?? 0) >= 5) {
        throw new Error("Maximum evidence items (5) reached for this booking.");
      }

      const user = await getCurrentUser(supabase);
      const { data, error } = await supabase
        .from("booking_operation_evidence")
        .insert({
          booking_id: bookingId,
          storage_bucket: input.storageBucket ?? "booking-operation-evidence",
          storage_path: input.storagePath,
          file_name: input.fileName,
          file_size_bytes: input.fileSizeBytes,
          mime_type: input.mimeType ?? null,
          uploaded_by_user_id: user.id
        })
        .select("*")
        .single();

      if (error) {
        fail(error, "Unable to upload evidence for booking.");
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
      } else if (!reportCard) {
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
