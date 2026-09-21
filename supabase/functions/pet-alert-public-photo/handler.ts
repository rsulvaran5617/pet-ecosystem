import { createClient } from "npm:@supabase/supabase-js@2";

const headers = {
  "cache-control": "no-store, max-age=0",
  "access-control-allow-origin": "*",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
};

export async function handlePublicPhotoRequest(
  request: Request,
): Promise<Response> {
  const unavailable = () => new Response(null, { status: 404, headers });
  if (request.method !== "GET") {
    return new Response(null, { status: 405, headers });
  }
  if (Deno.env.get("PET_ALERT_PUBLIC_MEDIA_ENABLED") !== "true") {
    return unavailable();
  }
  const path = new URL(request.url).searchParams.get("path");
  if (
    !path || path.length > 400 ||
    path.split("/").some((part) => !part || part === "." || part === "..") ||
    !path.endsWith(".jpg")
  ) return unavailable();
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return unavailable();
  try {
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const resolve = () =>
      client.rpc("resolve_pet_sos_public_photo", { target_path: path });
    const { data, error } = await resolve();
    if (error || data !== path) return unavailable();
    const source = await fetch(
      `${url.replace(/\/$/, "")}/storage/v1/object/pet-alert-media/${
        path.split("/").map(encodeURIComponent).join("/")
      }`,
      {
        headers: { authorization: `Bearer ${key}`, apikey: key },
        redirect: "error",
        cache: "no-store",
      },
    );
    if (
      !source.ok ||
      source.headers.get("content-type")?.split(";")[0] !== "image/jpeg" ||
      Number(source.headers.get("content-length")) > 5242880
    ) {
      await source.body?.cancel();
      return unavailable();
    }
    const reader = source.body?.getReader();
    if (!reader) return unavailable();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 5242880) {
          await reader.cancel();
          return unavailable();
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    if (!size) return unavailable();
    // Recheck after download: moderation or consent may have changed in flight.
    const final = await resolve();
    if (final.error || final.data !== path) return unavailable();
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.length;
    }
    return new Response(body, {
      headers: { ...headers, "content-type": "image/jpeg" },
    });
  } catch {
    return unavailable();
  }
}
