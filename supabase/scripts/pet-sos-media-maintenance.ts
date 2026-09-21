import {
  PET_ALERT_PHOTO_MAX_BYTES,
  type SanitizedPetAlertPhoto,
  sanitizePetAlertPhoto,
} from "../functions/_shared/pet-alert-media.ts";

type Kind = "community" | "external";
interface BackfillJob {
  status: "processing" | "already_ready";
  id: string;
  source_path: string;
  display_path: string;
  thumbnail_path: string;
}
export interface MaintenancePort {
  rpc<T>(name: string, body: Record<string, unknown>): Promise<T>;
  download(path: string): Promise<{ bytes: Uint8Array; mime: string }>;
  upload(path: string, bytes: Uint8Array): Promise<void>;
  remove(path: string): Promise<void>;
}

export async function backfill(
  port: MaintenancePort,
  kind: Kind,
  mediaId: string,
  sanitize: (
    bytes: Uint8Array,
    mime: string,
  ) => Promise<SanitizedPetAlertPhoto> = sanitizePetAlertPhoto,
) {
  const job = await port.rpc<BackfillJob>("prepare_pet_sos_media_backfill", {
    target_kind: kind,
    target_media: mediaId,
  });
  if (job.status === "already_ready") return "already_ready";
  if (job.status !== "processing" || !job.id) {
    throw new Error("MAINTENANCE_INVALID_JOB");
  }
  try {
    const source = await port.download(job.source_path);
    const photo = await sanitize(source.bytes, source.mime);
    await port.upload(job.display_path, photo.display);
    await port.upload(job.thumbnail_path, photo.thumbnail);
    await port.rpc("finalize_pet_sos_media_backfill", {
      target_job: job.id,
      display_size: photo.display.byteLength,
    });
    return "ready";
  } catch {
    // An uncertain finalize may already be committed. Abort never changes ready jobs.
    // Leave immutable uploads for the separately reviewed TTL cleanup, never delete here.
    try {
      await port.rpc("abort_pet_sos_media_backfill", { target_job: job.id });
    } catch { /* Lease expires. */ }
    throw new Error("MAINTENANCE_BACKFILL_FAILED_OR_UNCONFIRMED");
  }
}

export async function cleanup(
  port: MaintenancePort,
  objectId: string,
  updatedAt: string,
) {
  const tomb = await port.rpc<{ id: string; storage_path: string }>(
    "claim_pet_sos_orphan",
    {
      target_object: objectId,
      expected_updated_at: updatedAt,
    },
  );
  await port.remove(tomb.storage_path);
  await port.rpc("finish_pet_sos_orphan_cleanup", {
    target_tombstone: tomb.id,
  });
  return "deleted";
}

export async function readPhoto(response: Response) {
  if (!response.ok || !response.body) {
    throw new Error("MAINTENANCE_DOWNLOAD_FAILED");
  }
  const mime = response.headers.get("content-type")?.split(";")[0].trim() ?? "";
  if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) {
    await response.body.cancel();
    throw new Error("MAINTENANCE_INVALID_PHOTO");
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > PET_ALERT_PHOTO_MAX_BYTES) {
        throw new Error("MAINTENANCE_PHOTO_TOO_LARGE");
      }
      chunks.push(part.value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { bytes, mime };
}

export function createPort(
  url: string,
  key: string,
  request: typeof fetch = fetch,
): MaintenancePort {
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const encoded = (path: string) => {
    if (
      !path ||
      path.split("/").some((part) => !part || part === "." || part === "..")
    ) throw new Error("MAINTENANCE_INVALID_PATH");
    return path.split("/").map(encodeURIComponent).join("/");
  };
  const call = async (route: string, options: RequestInit) => {
    const response = await request(`${url}${route}`, {
      ...options,
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
      headers: { ...headers, ...options.headers },
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error("MAINTENANCE_REQUEST_FAILED");
    }
    return response;
  };
  return {
    async rpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
      const response = await call(`/rest/v1/rpc/${name}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await response.text();
      return (text ? JSON.parse(text) : null) as T;
    },
    async download(path) {
      return await readPhoto(
        await call(`/storage/v1/object/pet-alert-media/${encoded(path)}`, {
          method: "GET",
        }),
      );
    },
    async upload(path, bytes) {
      const response = await call(
        `/storage/v1/object/pet-alert-media/${encoded(path)}`,
        {
          method: "POST",
          headers: { "Content-Type": "image/jpeg", "x-upsert": "false" },
          body: new Blob([new Uint8Array(bytes)]),
        },
      );
      await response.body?.cancel();
    },
    async remove(path) {
      encoded(path);
      const response = await call("/storage/v1/object/pet-alert-media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: [path] }),
      });
      await response.body?.cancel();
    },
  };
}

export function parseOptions(args: string[], url: string) {
  const options = new Map<string, string>();
  for (const arg of args) {
    const match = /^--(mode|confirm-project|kind|id|updated-at)=(.+)$/.exec(
      arg,
    );
    const key = match?.[1] ??
      (arg === "--apply" || arg === "--reviewed" ? arg.slice(2) : "");
    if (!key || options.has(key)) {
      throw new Error("MAINTENANCE_INVALID_ARGUMENTS");
    }
    options.set(key, match?.[2] ?? "true");
  }
  const target = new URL(url);
  const project = options.get("confirm-project");
  if (
    !project || !/^[a-z0-9-]+$/.test(project) ||
    target.origin !== `https://${project}.supabase.co` ||
    target.pathname !== "/" || target.search || target.hash ||
    target.username || target.password
  ) throw new Error("MAINTENANCE_PROJECT_CONFIRMATION_REQUIRED");
  const mode = options.get("mode") ?? "inventory";
  if (!["inventory", "backfill", "cleanup"].includes(mode)) {
    throw new Error("MAINTENANCE_INVALID_MODE");
  }
  const apply = options.has("apply");
  if (apply && (mode === "inventory" || !options.has("reviewed"))) {
    throw new Error("MAINTENANCE_REVIEW_REQUIRED");
  }
  if (
    apply &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      options.get("id") ?? "",
    )
  ) throw new Error("MAINTENANCE_ID_REQUIRED");
  if (
    apply && mode === "backfill" &&
    !["community", "external"].includes(options.get("kind") ?? "")
  ) throw new Error("MAINTENANCE_INVALID_KIND");
  if (
    apply && mode === "cleanup" &&
    !Number.isFinite(Date.parse(options.get("updated-at") ?? ""))
  ) throw new Error("MAINTENANCE_VERSION_REQUIRED");
  return {
    mode,
    apply,
    project,
    id: options.get("id")!,
    kind: options.get("kind") as Kind,
    updatedAt: options.get("updated-at")!,
  };
}

if (import.meta.main) {
  try {
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const options = parseOptions(Deno.args, url);
    if (!key) throw new Error("MAINTENANCE_ENV_REQUIRED");
    const port = createPort(new URL(url).origin, key);
    if (!options.apply) {
      const inventory = await port.rpc("inspect_pet_sos_media_rollout", {});
      const candidates = await port.rpc("list_pet_sos_backfill_candidates", {
        result_limit: 25,
      });
      const orphans = await port.rpc<
        Array<{ object_id: string; object_updated_at: string }>
      >("list_pet_sos_orphan_media_candidates", { result_limit: 25 });
      console.log(
        JSON.stringify(
          {
            dryRun: true,
            project: options.project,
            inventory,
            candidates,
            orphans: orphans.map(({ object_id, object_updated_at }) => ({
              object_id,
              object_updated_at,
            })),
            limit: 25,
          },
          null,
          2,
        ),
      );
    } else {
      const result = options.mode === "backfill"
        ? await backfill(port, options.kind, options.id)
        : await cleanup(port, options.id, options.updatedAt);
      console.log(
        JSON.stringify({
          project: options.project,
          mode: options.mode,
          result,
        }),
      );
    }
  } catch {
    // Never echo HTTP error bodies, URLs, keys, private paths or image content.
    console.error(
      "Maintenance failed or result unconfirmed. Check arguments, project and private job state before retrying. No automatic cutover.",
    );
    Deno.exitCode = 1;
  }
}
