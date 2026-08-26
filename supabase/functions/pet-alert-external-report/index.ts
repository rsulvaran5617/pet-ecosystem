import { createClient } from "npm:@supabase/supabase-js@2";

const TERMS_VERSION = "pet-alert-external-v1";
const PRIVACY_VERSION = "pet-alert-external-v1";
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type JsonRecord = Record<string, unknown>;

function requiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required server configuration: ${name}`);
  return value;
}

function json(origin: string | null, body: JsonRecord, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": origin ?? "null",
      "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
      "access-control-allow-methods": "POST, OPTIONS",
      vary: "Origin"
    }
  });
}

function allowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const allowlist = requiredEnv("PET_ALERT_ALLOWED_ORIGINS")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return origin && allowlist.includes(origin) ? origin : null;
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomDigits() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(100000 + (bytes[0] % 900000));
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function verifyTurnstile(token: string, request: Request) {
  if (!token) return false;
  const payload = new FormData();
  payload.set("secret", requiredEnv("PET_ALERT_TURNSTILE_SECRET_KEY"));
  payload.set("response", token);
  const remoteIp = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (remoteIp) payload.set("remoteip", remoteIp);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: payload });
  if (!response.ok) return false;
  const result = await response.json() as { success?: boolean };
  return result.success === true;
}

async function sendCode(email: string, contactName: string, code: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${requiredEnv("RESEND_API_KEY")}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from: requiredEnv("PET_ALERT_FROM_EMAIL"),
      to: [email],
      subject: "Codigo para publicar tu alerta PET ALERT",
      text: `Hola ${contactName}. Tu codigo es ${code}. Vence en 10 minutos. Si no solicitaste este codigo, ignora este mensaje.`
    })
  });
  if (!response.ok) throw new Error("Email provider rejected verification message");
}

function serviceClient() {
  return createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

async function requestCode(request: Request, origin: string) {
  const body = await request.json() as JsonRecord;
  const email = normalizeEmail(body.email);
  const contactName = cleanText(body.contactName, 120);
  const turnstileToken = cleanText(body.turnstileToken, 4096);
  const accepted = body.acceptedTerms === true && body.acceptedPrivacy === true;
  if (!isEmail(email) || contactName.length < 2 || !accepted) {
    return json(origin, { ok: false, message: "Revisa el correo, nombre y consentimientos." }, 400);
  }
  if (!await verifyTurnstile(turnstileToken, request)) {
    return json(origin, { ok: false, message: "No pudimos validar la solicitud. Intenta nuevamente." }, 400);
  }

  const pepper = requiredEnv("PET_ALERT_OTP_PEPPER");
  const rawIp = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const fingerprint = await sha256(`${pepper}:ip:${rawIp}`);
  const supabase = serviceClient();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: ipCount } = await supabase
    .from("pet_alert_external_verification_challenges")
    .select("id", { count: "exact", head: true })
    .eq("request_fingerprint_hash", fingerprint)
    .gte("created_at", oneHourAgo);
  if ((ipCount ?? 0) >= 8) return json(origin, { ok: true, message: "Si los datos son validos, recibiras un codigo." });

  const { data: reporter, error: reporterError } = await supabase
    .from("pet_alert_external_reporters")
    .upsert({
      email_normalized: email,
      contact_name: contactName,
      terms_version: TERMS_VERSION,
      privacy_version: PRIVACY_VERSION,
      consented_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: "email_normalized" })
    .select("id")
    .single();
  if (reporterError || !reporter) throw new Error("Unable to prepare external reporter");

  const { count: emailCount } = await supabase
    .from("pet_alert_external_verification_challenges")
    .select("id", { count: "exact", head: true })
    .eq("external_reporter_id", reporter.id)
    .gte("created_at", oneHourAgo);
  if ((emailCount ?? 0) >= 3) return json(origin, { ok: true, message: "Si los datos son validos, recibiras un codigo." });

  const code = randomDigits();
  const challengeId = crypto.randomUUID();
  const codeHash = await sha256(`${pepper}:${challengeId}:${email}:${code}`);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const { error: challengeError } = await supabase.from("pet_alert_external_verification_challenges").insert({
    id: challengeId,
    external_reporter_id: reporter.id,
    purpose: "publish",
    code_hash: codeHash,
    expires_at: expiresAt,
    request_fingerprint_hash: fingerprint
  });
  if (challengeError) throw new Error("Unable to create verification challenge");
  await sendCode(email, contactName, code);
  return json(origin, { ok: true, challengeId, expiresAt, message: "Si los datos son validos, recibiras un codigo." });
}

function validateReport(payload: JsonRecord) {
  const petName = cleanText(payload.petName, 120);
  const petSpecies = cleanText(payload.petSpecies, 80);
  const city = cleanText(payload.lastSeenCity, 120);
  const country = cleanText(payload.lastSeenCountry, 80);
  const description = cleanText(payload.publicDescription, 1600);
  const lastSeenAt = typeof payload.lastSeenAt === "string" ? new Date(payload.lastSeenAt) : new Date("invalid");
  if (petName.length < 1 || petSpecies.length < 1 || city.length < 1 || country.length < 2 || description.length < 10 || Number.isNaN(lastSeenAt.getTime())) {
    throw new Error("PET_ALERT_REPORT_INVALID");
  }
  if (lastSeenAt.getTime() > Date.now() + 5 * 60 * 1000) throw new Error("PET_ALERT_REPORT_INVALID");
  return { petName, petSpecies, city, country, description, lastSeenAt: lastSeenAt.toISOString() };
}

async function submitReport(request: Request, origin: string) {
  const form = await request.formData();
  const payload = JSON.parse(String(form.get("payload") ?? "{}")) as JsonRecord;
  const challengeId = cleanText(form.get("challengeId"), 64);
  const code = cleanText(form.get("code"), 6);
  const turnstileToken = cleanText(form.get("turnstileToken"), 4096);
  if (!/^[0-9]{6}$/.test(code) || !/^[0-9a-f-]{36}$/.test(challengeId)) throw new Error("PET_ALERT_VERIFICATION_INVALID");
  if (!await verifyTurnstile(turnstileToken, request)) return json(origin, { ok: false, message: "No pudimos validar la solicitud." }, 400);
  const validated = validateReport(payload);
  const files = form.getAll("photos").filter((item): item is File => item instanceof File);
  if (files.length < 1 || files.length > 4 || files.some((file) => !ALLOWED_MEDIA_TYPES.has(file.type) || file.size <= 0 || file.size > MAX_FILE_BYTES)) {
    return json(origin, { ok: false, message: "Agrega entre 1 y 4 fotos JPG, PNG o WebP de hasta 5 MB." }, 400);
  }

  const email = normalizeEmail(payload.email);
  const pepper = requiredEnv("PET_ALERT_OTP_PEPPER");
  const codeHash = await sha256(`${pepper}:${challengeId}:${email}:${code}`);
  const supabase = serviceClient();
  const { data: reporterId, error: consumeError } = await supabase.rpc("consume_pet_alert_external_challenge", {
    target_challenge_id: challengeId,
    submitted_code_hash: codeHash
  });
  if (consumeError || !reporterId) return json(origin, { ok: false, message: "El codigo no es valido o ya vencio." }, 400);

  const { data: alert, error: alertError } = await supabase.rpc("create_external_pet_alert_report", {
    target_reporter_id: reporterId,
    next_pet_name: validated.petName,
    next_pet_species: validated.petSpecies,
    next_pet_breed: cleanText(payload.petBreed, 120),
    next_apparent_size: cleanText(payload.apparentSize, 20) || "unknown",
    next_apparent_sex: cleanText(payload.apparentSex, 20) || "unknown",
    next_primary_color: cleanText(payload.primaryColor, 80),
    next_last_seen_at: validated.lastSeenAt,
    next_last_seen_city: validated.city,
    next_last_seen_region: cleanText(payload.lastSeenRegion, 120),
    next_last_seen_country: validated.country,
    next_last_seen_reference: cleanText(payload.lastSeenReference, 240),
    next_public_description: validated.description,
    next_distinctive_marks: cleanText(payload.distinctiveMarks, 800),
    next_behavior_notes: cleanText(payload.behaviorNotes, 800),
    next_medical_public_notes: cleanText(payload.medicalPublicNotes, 500),
    next_terms_version: TERMS_VERSION,
    next_privacy_version: PRIVACY_VERSION
  });
  if (alertError || !alert?.id) throw new Error("Unable to create external alert");

  const uploadedPaths: string[] = [];
  try {
    for (const [index, file] of files.entries()) {
      const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `external/${reporterId}/${alert.id}/${String(index + 1).padStart(2, "0")}-${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("pet-alert-media").upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      uploadedPaths.push(path);
      const { error: mediaError } = await supabase.from("pet_alert_media").insert({
        lost_pet_alert_id: alert.id,
        storage_bucket: "pet-alert-media",
        storage_path: path,
        media_type: file.type,
        visibility: "public",
        created_by_user_id: null
      });
      if (mediaError) throw mediaError;
    }
  } catch (error) {
    if (uploadedPaths.length) await supabase.storage.from("pet-alert-media").remove(uploadedPaths);
    await supabase.from("pet_alert_status_history").delete().eq("lost_pet_alert_id", alert.id);
    await supabase.from("pet_alert_media").delete().eq("lost_pet_alert_id", alert.id);
    await supabase.from("pet_alert_lost_pets").delete().eq("id", alert.id);
    throw error;
  }

  const accessToken = randomToken();
  const tokenHash = await sha256(`${pepper}:access:${accessToken}`);
  const { error: tokenError } = await supabase.from("pet_alert_external_access_tokens").insert({
    external_reporter_id: reporterId,
    lost_pet_alert_id: alert.id,
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  });
  if (tokenError) {
    await supabase.storage.from("pet-alert-media").remove(uploadedPaths);
    await supabase.from("pet_alert_status_history").delete().eq("lost_pet_alert_id", alert.id);
    await supabase.from("pet_alert_media").delete().eq("lost_pet_alert_id", alert.id);
    await supabase.from("pet_alert_lost_pets").delete().eq("id", alert.id);
    throw new Error("Unable to issue external report access token");
  }
  return json(origin, {
    ok: true,
    status: "pending_review",
    reference: alert.alert_slug,
    managementToken: accessToken,
    message: "Recibimos tu reporte. Un moderador lo revisara antes de publicarlo."
  }, 201);
}

Deno.serve(async (request) => {
  let origin: string | null = null;
  try {
    origin = allowedOrigin(request);
    if (!origin) return json(null, { ok: false, message: "Origen no autorizado." }, 403);
    if (request.method === "OPTIONS") return json(origin, { ok: true });
    if (request.method !== "POST") return json(origin, { ok: false, message: "Metodo no permitido." }, 405);
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) return await requestCode(request, origin);
    if (contentType.includes("multipart/form-data")) return await submitReport(request, origin);
    return json(origin, { ok: false, message: "Solicitud no valida." }, 415);
  } catch (error) {
    console.error("pet-alert-external-report failed", error instanceof Error ? error.message : "unknown");
    return json(origin, { ok: false, message: "No fue posible procesar el reporte de forma segura. Intenta nuevamente." }, 500);
  }
});
