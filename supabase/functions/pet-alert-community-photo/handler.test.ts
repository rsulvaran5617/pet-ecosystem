import assert from "node:assert/strict";
import { handleCommunityPhotoRequest } from "./handler.ts";

const report = "00000000-0000-0000-0000-000000000001";
const actor = "00000000-0000-0000-0000-000000000002";
const attempt = "00000000-0000-0000-0000-000000000003";
const path = `${report}/sos-v1/${attempt}.jpg`;

Deno.test("community upload authorization, sanitation and safe retries", async (suite) => {
  const env = {
    SUPABASE_URL: "https://fixture.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "fixture",
    PET_ALERT_ALLOWED_ORIGINS: "https://app.invalid",
  };
  const previous = Object.fromEntries(
    Object.keys(env).map((key) => [key, Deno.env.get(key)]),
  );
  for (const [key, value] of Object.entries(env)) Deno.env.set(key, value);
  const originalFetch = globalThis.fetch;
  const worker = new Worker(
    new URL("../_shared/pet-alert-media.fixtures.ts", import.meta.url).href,
    { type: "module" },
  );
  const photo: Uint8Array = await new Promise((resolve, reject) => {
    worker.onmessage = (event) => resolve(event.data.pngMetadata);
    worker.onerror = (event) => {
      event.preventDefault();
      reject(new Error(event.message));
    };
  }).finally(() => worker.terminate()) as Uint8Array;
  let mode = "success";
  const calls: string[] = [];
  let uploaded: Uint8Array | undefined;
  globalThis.fetch = async (input, init) => {
    const req = new Request(input, init);
    const url = new URL(req.url);
    calls.push(`${req.method} ${url.pathname}`);
    if (url.pathname.endsWith("/pet_sos_ready_media_only")) {
      return Response.json(mode === "strict");
    }
    if (url.pathname === "/auth/v1/user") {
      return mode === "bad-jwt"
        ? Response.json({ message: "Invalid" }, { status: 401 })
        : Response.json({ id: actor });
    }
    if (url.pathname.endsWith("/prepare_pet_alert_community_photo")) {
      const args = await req.json();
      assert.equal(args.target_actor_id, actor);
      assert.match(args.target_sha256, /^[a-f0-9]{64}$/);
      if (mode === "foreign") {
        return Response.json({ message: "PET_ALERT_UNAUTHORIZED" }, {
          status: 400,
        });
      }
      return Response.json({
        id: report,
        attempt_id: attempt,
        storage_path: path,
        status: mode === "replay" ? "ready" : "uploading",
      });
    }
    if (url.pathname.endsWith("/finalize_pet_alert_community_photo")) {
      return mode.startsWith("uncertain")
        ? Response.json({ message: "Unknown" }, { status: 500 })
        : Response.json(path);
    }
    if (url.pathname.endsWith("/abort_pet_alert_community_photo")) {
      if (mode === "uncertain-abort") {
        return Response.json({ message: "Unknown" }, { status: 500 });
      }
      return Response.json(mode === "invalid" ? path : null);
    }
    if (req.method === "DELETE") return Response.json([]);
    if (url.pathname.startsWith("/storage/v1/object/sign/")) {
      return Response.json({ signedURL: "/object/sign/fixture?token=fixture" });
    }
    if (url.pathname.startsWith("/storage/v1/object/")) {
      assert.equal(req.headers.get("content-type"), "image/jpeg");
      uploaded = new Uint8Array(await req.arrayBuffer());
      return Response.json({ Key: path });
    }
    throw new Error(`Unexpected mock path ${url.pathname}`);
  };
  const request = (
    body: Uint8Array = photo,
    headers: Record<string, string> = {},
  ) =>
    new Request("https://fixture.invalid/upload", {
      method: "POST",
      headers: {
        authorization: "Bearer fixture",
        "content-type": "image/png",
        "x-pet-report-id": report,
        "x-pet-photo-order": "0",
        ...headers,
      },
      body: Uint8Array.from(body),
    });
  try {
    await suite.step("strict mode never issues a signed storage URL", async () => {
      mode = "strict"; calls.length = 0;
      const response = await handleCommunityPhotoRequest(request());
      assert.equal(response.status, 200);
      assert.match((await response.json()).signedUrl, /functions\/v1\/pet-alert-public-photo/);
      assert.ok(!calls.some((call) => call.includes("/object/sign/")));
    });
    for (
      const testMode of [
        "bad-jwt",
        "foreign",
        "success",
        "replay",
        "invalid",
        "uncertain-finalize",
        "uncertain-abort",
      ]
    ) {
      await suite.step(testMode, async () => {
        mode = testMode;
        calls.length = 0;
        uploaded = undefined;
        const response = await handleCommunityPhotoRequest(
          request(mode === "invalid" ? new Uint8Array([1, 2, 3]) : photo),
        );
        assert.equal(
          response.status,
          mode === "bad-jwt"
            ? 401
            : mode === "foreign"
            ? 403
            : mode === "invalid"
            ? 400
            : mode.startsWith("uncertain")
            ? 503
            : 200,
        );
        if (mode === "success") {
          assert.ok(uploaded);
          assert.equal(uploaded[0], 0xff);
          assert.equal(uploaded[1], 0xd8);
          assert.notDeepEqual(uploaded, photo);
        }
        if (["bad-jwt", "foreign", "replay", "invalid"].includes(mode)) {
          assert.equal(uploaded, undefined);
        }
        if (mode.startsWith("uncertain")) {
          assert.ok(!calls.some((call) => call.startsWith("DELETE")));
        }
      });
    }
    await suite.step(
      "denies origin and missing token before any remote call",
      async () => {
        calls.length = 0;
        assert.equal(
          (await handleCommunityPhotoRequest(
            request(photo, { origin: "https://evil.invalid" }),
          )).status,
          403,
        );
        assert.equal(
          (await handleCommunityPhotoRequest(
            request(photo, { authorization: "" }),
          )).status,
          401,
        );
        assert.equal(calls.length, 0);
      },
    );
    await suite.step(
      "rejects oversized stream without Content-Length before reservation",
      async () => {
        mode = "success";
        calls.length = 0;
        assert.equal(
          (await handleCommunityPhotoRequest(
            request(new Uint8Array(5 * 1024 * 1024 + 1)),
          )).status,
          400,
        );
        assert.ok(!calls.some((call) => call.includes("/rpc/")));
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  }
});
