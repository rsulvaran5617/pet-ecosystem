import type { createClinicalAccessApiClient } from "@pet/api-client";
import type { ClinicalDocumentType, FinalizeClinicalEncounterInput, PreparedClinicalDocumentUpload } from "@pet/types";

type SubmissionClient = Pick<ReturnType<typeof createClinicalAccessApiClient>,
  "finalizeClinicalEncounter" | "prepareClinicalDocumentUpload" | "uploadPreparedClinicalDocument">;

export interface ClinicalEncounterSubmission {
  input: FinalizeClinicalEncounterInput;
  attachment: { file: Blob; title: string; documentType: ClinicalDocumentType; idempotencyKey: string } | null;
  encounterId: string | null;
  prepared: PreparedClinicalDocumentUpload | null;
  documentComplete: boolean;
}

// In-memory checkpoint for a single confirmation. Never persist clinical text or files.
export async function submitClinicalEncounter(client: SubmissionClient, attempt: ClinicalEncounterSubmission): Promise<string> {
  if (!attempt.encounterId) attempt.encounterId = await client.finalizeClinicalEncounter(attempt.input);
  if (attempt.attachment && !attempt.documentComplete) {
    const attachment = attempt.attachment;
    if (!attempt.prepared) {
      attempt.prepared = await client.prepareClinicalDocumentUpload({
        encounterId: attempt.encounterId,
        idempotencyKey: attachment.idempotencyKey,
        title: attachment.title,
        documentType: attachment.documentType,
        mimeType: attachment.file.type as "application/pdf" | "image/jpeg" | "image/png",
        fileSizeBytes: attachment.file.size
      });
    }
    await client.uploadPreparedClinicalDocument(attempt.prepared, attachment.file);
    attempt.documentComplete = true;
  }
  return attempt.encounterId;
}
