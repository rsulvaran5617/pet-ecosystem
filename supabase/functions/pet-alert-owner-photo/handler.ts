import { createClient } from "npm:@supabase/supabase-js@2";
import {
  PET_ALERT_PHOTO_MAX_BYTES,
  PetAlertPhotoError,
  sanitizePetAlertPhoto,
} from "../_shared/pet-alert-media.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const errors: Record<string, number> = {
  PET_ALERT_UNAUTHORIZED: 403,
  PET_ALERT_PHOTO_INVALID: 400,
  PET_ALERT_PHOTO_CONSENT_REQUIRED: 400,
  PET_ALERT_PHOTO_MISSING: 409,
  PET_ALERT_PHOTO_BUSY: 409,
  PET_ALERT_PHOTO_STALE: 409,
  PET_ALERT_REPORT_NOT_AVAILABLE: 409,
  PET_ALERT_RATE_LIMITED: 429,
};
interface Job {
  attempt_id: string;
  source_path: string;
  display_path: string;
  thumbnail_path: string;
  status: "processing" | "ready";
}

async function boundedBytes(
  input: Request | Response,
  limit: number,
): Promise<Uint8Array<ArrayBuffer>> {
  if (Number(input.headers.get("content-length")) > limit) {
    await input.body?.cancel();
    throw new PetAlertPhotoError();
  }
  const reader = input.body?.getReader();
  if (!reader) throw new PetAlertPhotoError();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > limit) {
        await reader.cancel();
        throw new PetAlertPhotoError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (!length) throw new PetAlertPhotoError();
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

export async function handleOwnerPhotoRequest(
  request: Request,
): Promise<Response> {
  const origin = request.headers.get("origin");
  const allowed = (Deno.env.get("PET_ALERT_ALLOWED_ORIGINS") ?? "").split(",")
    .map((item) => item.trim()).filter(Boolean);
  const permitted = !!origin && allowed.includes(origin);
  const reply = (data: Record<string, unknown>, status = 200) =>
    Response.json(data, {
      status,
      headers: {
        "cache-control": "no-store",
        "access-control-allow-origin": permitted ? origin! : "null",
        "access-control-allow-headers":
          "authorization, apikey, content-type, x-client-info",
        "access-control-allow-methods": "POST, OPTIONS",
        vary: "Origin",
      },
    });
  if (origin && !permitted) {
    return reply({ error: "PET_ALERT_UNAUTHORIZED" }, 403);
  }
  if (request.method === "OPTIONS") return reply({ ok: true });
  if (request.method !== "POST") {
    return reply({ error: "METHOD_NOT_ALLOWED" }, 405);
  }
  if (Deno.env.get("PET_ALERT_OWNER_DERIVATIVES_ENABLED") !== "true") {
    return reply({ error: "PET_ALERT_PHOTO_UNAVAILABLE" }, 503);
  }
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)
    ?.[1];
  if (!token) return reply({ error: "PET_ALERT_UNAUTHORIZED" }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return reply({ error: "PET_ALERT_PHOTO_UNAVAILABLE" }, 503);
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let job: Job | undefined;
  let actor: string | undefined;
  let alertId: string | undefined;
  try {
    const { data: auth, error: authError } = await client.auth.getUser(token);
    if (authError || !auth.user) {
      return reply({ error: "PET_ALERT_UNAUTHORIZED" }, 401);
    }
    actor = auth.user.id;
    let payload: unknown;
    try {
      payload = JSON.parse(
        new TextDecoder().decode(await boundedBytes(request, 2048)),
      );
    } catch {
      throw new PetAlertPhotoError();
    }
    if (
      !payload || typeof payload !== "object" || !("alertId" in payload) ||
      typeof payload.alertId !== "string" || !UUID.test(payload.alertId)
    ) throw new PetAlertPhotoError();
    if (!("photoConsent" in payload) || payload.photoConsent !== true) {
      return reply({ error: "PET_ALERT_PHOTO_CONSENT_REQUIRED" }, 400);
    }
    // Never accept source URLs, bucket paths or actor identity from the caller.
    if (
      Object.keys(payload).some((name) =>
        name !== "alertId" && name !== "photoConsent"
      )
    ) throw new PetAlertPhotoError();
    alertId = payload.alertId.toLowerCase();
    const { data, error } = await client.rpc("prepare_pet_alert_owner_photo", {
      target_alert_id: alertId,
      target_actor_id: actor,
      photo_consent: true,
    });
    if (error) throw error;
    if (
      !data || !UUID.test(data.attempt_id) || !UUID.test(data.pet_id) ||
      !["processing", "ready"].includes(data.status) ||
      typeof data.source_path !== "string" ||
      !data.source_path.startsWith(`${data.pet_id}/`) ||
      data.source_path.split("/").some((part: string) =>
        !part || part === "." || part === ".."
      ) ||
      data.display_path !==
        `owner-sos-v1/${alertId}/${data.attempt_id}/display.jpg` ||
      data.thumbnail_path !==
        `owner-sos-v1/${alertId}/${data.attempt_id}/thumbnail.jpg`
    ) throw new Error("Invalid reservation");
    job = data as Job;
    if (job.status !== "ready") {
      const downloadPath = job.source_path.split("/").map(encodeURIComponent)
        .join("/");
      const source = await fetch(
        `${
          url.replace(/\/$/, "")
        }/storage/v1/object/pet-avatars/${downloadPath}`,
        {
          headers: { authorization: `Bearer ${key}`, apikey: key },
          redirect: "error",
          cache: "no-store",
        },
      );
      if (!source.ok) {
        await source.body?.cancel();
        throw new Error("Avatar unavailable");
      }
      const bytes = await boundedBytes(source, PET_ALERT_PHOTO_MAX_BYTES);
      const photo = await sanitizePetAlertPhoto(
        bytes,
        source.headers.get("content-type")?.split(";")[0].trim() ?? "",
      );
      const bucket = client.storage.from("pet-alert-media");
      for (
        const [path, content] of [[job.display_path, photo.display], [
          job.thumbnail_path,
          photo.thumbnail,
        ]] as const
      ) {
        const { error: uploadError } = await bucket.upload(path, content, {
          contentType: "image/jpeg",
          upsert: false,
        });
        if (uploadError) throw uploadError;
      }
      const { error: finalizeError } = await client.rpc(
        "finalize_pet_alert_owner_photo",
        {
          target_alert_id: alertId,
          target_actor_id: actor,
          target_attempt_id: job.attempt_id,
          display_size: photo.display.length,
          thumbnail_size: photo.thumbnail.length,
        },
      );
      if (finalizeError) throw finalizeError;
    }
    // Ready is private preparation, not a promise of public visibility or a signed original.
    return reply({ status: "ready" });
  } catch (error) {
    if (job?.status === "processing" && actor && alertId) {
      try {
        const { data: paths, error: abortError } = await client.rpc(
          "abort_pet_alert_owner_photo",
          {
            target_alert_id: alertId,
            target_actor_id: actor,
            target_attempt_id: job.attempt_id,
          },
        );
        if (
          !abortError && Array.isArray(paths) && paths.length === 2 &&
          paths[0] === job.display_path && paths[1] === job.thumbnail_path
        ) {
          await client.storage.from("pet-alert-media").remove(paths);
        }
      } catch {
        /* An uncertain commit must not authorize deleting a ready derivative. */
      }
    }
    const message = error instanceof PetAlertPhotoError
      ? "PET_ALERT_PHOTO_INVALID"
      : typeof error === "object" && error !== null && "message" in error
      ? String(error.message)
      : "";
    const code = Object.hasOwn(errors, message)
      ? message
      : "PET_ALERT_PHOTO_UNAVAILABLE";
    return reply({ error: code }, errors[code] ?? 503);
  }
}
