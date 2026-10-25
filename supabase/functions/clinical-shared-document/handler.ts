export interface DocumentAccess { bucket: string; path: string; mimeType: string | null }
export interface DocumentGateway {
  authenticate(jwt: string): Promise<boolean>;
  authorize(jwt: string, token: string, documentId: string): Promise<DocumentAccess | null>;
  download(access: DocumentAccess): Promise<Blob | null>;
}

export async function handleSharedDocument(request: Request, gateway: DocumentGateway, origins: string[]): Promise<Response> {
  const origin = request.headers.get("origin");
  const permitted = !!origin && origins.includes(origin);
  const headers = {
    "cache-control": "private, no-store, max-age=0",
    "access-control-allow-origin": permitted ? origin : "null",
    "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-expose-headers": "x-document-type",
    "x-content-type-options": "nosniff",
    vary: "Origin",
  };
  const deny = (status: number) => Response.json({ error: "Documento no disponible. Revisa la autorizacion temporal." }, { status, headers });
  if (origin && !permitted) return deny(403);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return deny(405);
  const jwt = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!jwt) return deny(401);
  try {
    if (!await gateway.authenticate(jwt)) return deny(401);
    // Bounded read even when Content-Length is absent or forged.
    const reader = request.body?.getReader();
    if (!reader) return deny(400);
    let body = "";
    let size = 0;
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 1024) { await reader.cancel(); return deny(400); }
        body += decoder.decode(value, { stream: true });
      }
      body += decoder.decode();
    } finally { reader.releaseLock(); }
    let input: unknown;
    try { input = JSON.parse(body); } catch { return deny(400); }
    if (!input || typeof input !== "object" || !("token" in input) || !("documentId" in input)
      || typeof input.token !== "string" || !/^[a-f0-9]{64}$/.test(input.token)
      || typeof input.documentId !== "string" || !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(input.documentId)
      || Object.keys(input).some((key) => key !== "token" && key !== "documentId")) return deny(400);
    const access = await gateway.authorize(jwt, input.token, input.documentId);
    if (!access || access.bucket !== "pet-documents") return deny(403);
    const blob = await gateway.download(access);
    if (!blob || blob.size === 0 || blob.size > 10 * 1024 * 1024) return deny(404);
    // A revoke, expiry, delete or replacement while fetching must fail closed.
    const current = await gateway.authorize(jwt, input.token, input.documentId);
    if (!current || current.bucket !== access.bucket || current.path !== access.path || current.mimeType !== access.mimeType) return deny(403);
    const bytes = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
    const starts = (...signature: number[]) => signature.every((value, i) => bytes[i] === value);
    let mime = "application/octet-stream";
    if (starts(0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10)) mime = "image/png";
    else if (starts(0xff, 0xd8, 0xff)) mime = "image/jpeg";
    else if (starts(0x47, 0x49, 0x46, 0x38)) mime = "image/gif";
    else if (starts(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) mime = "image/webp";
    else if (starts(0x25, 0x50, 0x44, 0x46, 0x2d)) mime = "application/pdf";
    return new Response(blob, { headers: { ...headers, "content-type": "application/octet-stream", "x-document-type": mime,
      "content-disposition": "attachment; filename=\"documento\"" } });
  } catch {
    // No tokens, storage paths or database error details in logs/responses.
    return deny(403);
  }
}
