import { createClient } from "npm:@supabase/supabase-js@2";
import {
  PET_ALERT_PHOTO_MAX_BYTES,
  PetAlertPhotoError,
  sanitizePetAlertPhoto,
} from "../_shared/pet-alert-media.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ERRORS: Record<string, number> = {
  PET_ALERT_UNAUTHORIZED: 403,
  PET_ALERT_PHOTO_INVALID: 400,
  PET_ALERT_PHOTO_BUSY: 409,
  PET_ALERT_PHOTO_SLOT_TAKEN: 409,
  PET_ALERT_PHOTO_STALE: 409,
  PET_ALERT_PHOTO_NOT_READY: 409,
  PET_ALERT_PHOTO_REMOVED: 409,
  PET_ALERT_REPORT_NOT_AVAILABLE: 409,
  PET_ALERT_RATE_LIMITED: 429,
};
interface UploadJob {
  id: string;
  attempt_id: string;
  storage_path: string;
  status: "uploading" | "ready";
}

async function readPhoto(request: Request): Promise<Uint8Array> {
  if (
    Number(request.headers.get("content-length")) > PET_ALERT_PHOTO_MAX_BYTES
  ) {
    await request.body?.cancel();
    throw new PetAlertPhotoError();
  }
  const reader = request.body?.getReader();
  if (!reader) throw new PetAlertPhotoError();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > PET_ALERT_PHOTO_MAX_BYTES) {
        await reader.cancel();
        throw new PetAlertPhotoError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (!size) throw new PetAlertPhotoError();
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

export async function handleCommunityPhotoRequest(
  request: Request,
): Promise<Response> {
  const origin = request.headers.get("origin");
  const origins = (Deno.env.get("PET_ALERT_ALLOWED_ORIGINS") ?? "").split(",")
    .map((item) => item.trim()).filter(Boolean);
  const permittedOrigin = origin && origins.includes(origin) ? origin : null;
  const respond = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
        "access-control-allow-origin": permittedOrigin ?? "null",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers":
          "authorization, apikey, content-type, x-client-info, x-pet-report-id, x-pet-photo-order",
        vary: "Origin",
      },
    });
  if (origin && !permittedOrigin) {
    return respond({ error: "PET_ALERT_UNAUTHORIZED" }, 403);
  }
  if (request.method === "OPTIONS") return respond({ ok: true });
  if (request.method !== "POST") {
    return respond({ error: "METHOD_NOT_ALLOWED" }, 405);
  }
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)
    ?.[1];
  if (!token) return respond({ error: "PET_ALERT_UNAUTHORIZED" }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    return respond({ error: "PET_ALERT_PHOTO_UNAVAILABLE" }, 503);
  }
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let job: UploadJob | undefined;
  let actor: string | undefined;
  try {
    const { data: auth, error: authError } = await client.auth.getUser(token);
    if (authError || !auth.user) {
      return respond({ error: "PET_ALERT_UNAUTHORIZED" }, 401);
    }
    actor = auth.user.id;
    const reportId = request.headers.get("x-pet-report-id") ?? "";
    const order = request.headers.get("x-pet-photo-order") ?? "";
    const mime = request.headers.get("content-type") ?? "";
    if (
      !UUID.test(reportId) || !/^[0-2]$/.test(order) ||
      !["image/jpeg", "image/png", "image/webp"].includes(mime)
    ) throw new PetAlertPhotoError();
    const bytes = await readPhoto(request);
    const digest = await crypto.subtle.digest(
      "SHA-256",
      bytes as Uint8Array<ArrayBuffer>,
    );
    const hash = Array.from(
      new Uint8Array(digest),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("");
    const { data, error } = await client.rpc(
      "prepare_pet_alert_community_photo",
      {
        target_report_id: reportId,
        target_actor_id: actor,
        target_sha256: hash,
        target_order: Number(order),
      },
    );
    if (error) throw error;
    if (
      !data || !UUID.test(data.id) || !UUID.test(data.attempt_id) ||
      data.storage_path !==
        `${reportId.toLowerCase()}/sos-v1/${data.attempt_id}.jpg` ||
      !["ready", "uploading"].includes(data.status)
    ) throw new Error("Invalid upload reservation");
    job = data as UploadJob;
    const bucket = client.storage.from("pet-alert-media");
    if (job.status !== "ready") {
      const photo = await sanitizePetAlertPhoto(bytes, mime);
      const { error: uploadError } = await bucket.upload(
        job.storage_path,
        photo.display,
        { contentType: photo.mimeType, upsert: false },
      );
      if (uploadError) throw uploadError;
      const { error: thumbnailError } = await bucket.upload(
        `${job.storage_path}.thumb.jpg`,
        photo.thumbnail,
        { contentType: photo.mimeType, upsert: false },
      );
      if (thumbnailError) throw thumbnailError;
      const { error: finalizeError } = await client.rpc(
        "finalize_pet_alert_community_photo",
        {
          target_upload_id: job.id,
          target_actor_id: actor,
          target_attempt_id: job.attempt_id,
          target_size: photo.display.byteLength,
        },
      );
      if (finalizeError) throw finalizeError;
    }
    const { data: strict, error: modeError } = await client.rpc(
      "pet_sos_ready_media_only",
    );
    if (modeError || typeof strict !== "boolean") {
      throw new Error("Media mode unavailable");
    }
    if (strict) {
      const publicUrl = new URL(
        `${url.replace(/\/$/, "")}/functions/v1/pet-alert-public-photo`,
      );
      publicUrl.searchParams.set("path", job.storage_path);
      return respond({ signedUrl: publicUrl.toString() });
    }
    const { data: signed, error: signError } = await bucket.createSignedUrl(
      job.storage_path,
      900,
    );
    if (signError || !signed?.signedUrl) throw new Error("Signing unavailable");
    return respond({ signedUrl: signed.signedUrl });
  } catch (error) {
    if (job && actor && job.status === "uploading") {
      try {
        const { data: removable, error: abortError } = await client.rpc(
          "abort_pet_alert_community_photo",
          {
            target_upload_id: job.id,
            target_actor_id: actor,
            target_attempt_id: job.attempt_id,
          },
        );
        // An uncertain finalization/abort is not permission to delete a published image.
        if (!abortError && removable === job.storage_path) {
          await client.storage.from("pet-alert-media").remove([
            removable,
            `${removable}.thumb.jpg`,
          ]);
        }
      } catch {
        /* Reconcile private orphans in the subsequent cleanup slice. */
      }
    }
    const message = error instanceof PetAlertPhotoError
      ? "PET_ALERT_PHOTO_INVALID"
      : typeof error === "object" && error !== null && "message" in error
      ? String(error.message)
      : "";
    const code = Object.hasOwn(ERRORS, message)
      ? message
      : "PET_ALERT_PHOTO_UNAVAILABLE";
    return respond({ error: code }, ERRORS[code] ?? 503);
  }
}
