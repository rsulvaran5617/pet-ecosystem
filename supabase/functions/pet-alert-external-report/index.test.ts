import assert from "node:assert/strict";
import { ImageMagick, MagickFormat } from "npm:@imagemagick/magick-wasm@0.0.43";
import { handleExternalPetAlertRequest } from "./handler.ts";

const origin = "https://fixture.example.invalid";
const reportId = "00000000-0000-0000-0000-000000000001";
const reporterId = "00000000-0000-0000-0000-000000000002";

async function fixture(): Promise<Uint8Array> {
  const worker = new Worker(
    new URL("../_shared/pet-alert-media.fixtures.ts", import.meta.url).href,
    { type: "module" },
  );
  try {
    return await new Promise((resolve, reject) => {
      worker.onmessage = (event) => resolve(event.data.pngMetadata);
      worker.onerror = (event) => {
        event.preventDefault();
        reject(new Error(event.message));
      };
    });
  } finally {
    worker.terminate();
  }
}

function submission(bytes: Uint8Array) {
  const form = new FormData();
  form.set(
    "payload",
    JSON.stringify({
      petName: "Fixture",
      petSpecies: "Perro",
      lastSeenCity: "Ciudad",
      lastSeenCountry: "PA",
      publicDescription: "Reporte sintetico de pruebas",
      lastSeenAt: new Date().toISOString(),
      email: "fixture@example.invalid",
    }),
  );
  form.set("challengeId", "00000000-0000-0000-0000-000000000003");
  form.set("code", "123456");
  form.set("turnstileToken", "fixture");
  form.set(
    "photos",
    new Blob([Uint8Array.from(bytes)], { type: "image/png" }),
    "private-original-name.png",
  );
  return new Request(`${origin}/external-report`, {
    method: "POST",
    headers: { origin },
    body: form,
  });
}

Deno.test("external upload handler: only sanitized bytes reach storage", async (suite) => {
  const env = {
    PET_ALERT_ALLOWED_ORIGINS: origin,
    PET_ALERT_TURNSTILE_SECRET_KEY: "fixture",
    PET_ALERT_OTP_PEPPER: "fixture",
    SUPABASE_URL: "https://supabase.example.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "fixture-not-a-secret",
  };
  const previous = new Map(
    Object.keys(env).map((name) => [name, Deno.env.get(name)]),
  );
  for (const [name, value] of Object.entries(env)) Deno.env.set(name, value);
  const realFetch = globalThis.fetch;
  const calls: string[] = [];
  let verified = true;
  let uploaded: Uint8Array | undefined;
  let source: Uint8Array;
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    calls.push(url.pathname);
    if (url.hostname === "challenges.cloudflare.com") {
      return Response.json({ success: true });
    }
    if (url.pathname.endsWith("/rpc/consume_pet_alert_external_challenge")) {
      return Response.json(verified ? reporterId : null);
    }
    if (url.pathname.endsWith("/rpc/create_external_pet_alert_report")) {
      return Response.json({ id: reportId, alert_slug: "fixture-external" });
    }
    if (url.pathname.startsWith("/storage/v1/object/pet-alert-media/")) {
      assert.equal(request.headers.get("content-type"), "image/jpeg");
      assert.ok(url.pathname.endsWith(".jpg"));
      assert.equal(url.pathname.includes("private-original-name"), false);
      uploaded = new Uint8Array(await request.arrayBuffer());
      return Response.json({ Key: "fixture" });
    }
    if (url.pathname.endsWith("/pet_alert_media")) {
      const metadata = await request.json();
      assert.equal(metadata.media_type, "image/jpeg");
      assert.equal(metadata.lost_pet_alert_id, reportId);
      return new Response(null, { status: 201 });
    }
    if (url.pathname.endsWith("/pet_alert_external_access_tokens")) {
      return new Response(null, { status: 201 });
    }
    throw new Error(`Unexpected mock endpoint ${url.pathname}`);
  };
  try {
    source = await fixture();
    await suite.step(
      "invalid verification cannot create an alert or upload",
      async () => {
        verified = false;
        calls.length = 0;
        assert.equal(
          (await handleExternalPetAlertRequest(submission(source))).status,
          400,
        );
        assert.equal(
          calls.some((url) =>
            url.includes("create_external") || url.includes("/storage/")
          ),
          false,
        );
        verified = true;
      },
    );
    await suite.step(
      "corrupt photo is rejected before any alert or storage mutation",
      async () => {
        calls.length = 0;
        const response = await handleExternalPetAlertRequest(
          submission(new Uint8Array([1, 2, 3])),
        );
        assert.equal(response.status, 400);
        assert.match((await response.json()).message, /nuevo codigo/);
        assert.equal(
          calls.some((url) =>
            url.includes("create_external") || url.includes("/storage/")
          ),
          false,
        );
      },
    );
    await suite.step(
      "verified external report stores JPEG derivative without EXIF, never source bytes",
      async () => {
        calls.length = 0;
        const response = await handleExternalPetAlertRequest(
          submission(source),
        );
        assert.equal(response.status, 201);
        assert.equal((await response.json()).status, "pending_review");
        assert.ok(uploaded);
        assert.notDeepEqual(uploaded, source);
        ImageMagick.read(uploaded, (image) => {
          assert.equal(image.format, MagickFormat.Jpeg);
          assert.equal(image.profileNames.length, 0);
          assert.equal(image.width, 30);
          assert.equal(image.height, 60);
        });
        assert.equal(
          calls.filter((url) => url.includes("/storage/")).length,
          2,
        );
      },
    );
    await suite.step(
      "invalid second photo cannot partially publish the first one",
      async () => {
        calls.length = 0;
        const form = await submission(source).formData();
        form.append(
          "photos",
          new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }),
          "invalid.png",
        );
        const response = await handleExternalPetAlertRequest(
          new Request(origin, {
            method: "POST",
            headers: { origin },
            body: form,
          }),
        );
        assert.equal(response.status, 400);
        assert.equal(
          calls.some((url) =>
            url.includes("create_external") || url.includes("/storage/")
          ),
          false,
        );
      },
    );
    await suite.step(
      "oversized declared multipart body is rejected before external calls",
      async () => {
        calls.length = 0;
        const response = await handleExternalPetAlertRequest(
          new Request(origin, {
            method: "POST",
            headers: {
              origin,
              "content-type": "multipart/form-data",
              "content-length": String(22 * 1024 * 1024),
            },
            body: "x",
          }),
        );
        assert.equal(response.status, 413);
        assert.equal(calls.length, 0);
      },
    );
    await suite.step(
      "streamed body is bounded even without Content-Length",
      async () => {
        calls.length = 0;
        const response = await handleExternalPetAlertRequest(
          new Request(origin, {
            method: "POST",
            headers: { origin, "content-type": "application/json" },
            body: new ReadableStream({
              start(controller) {
                controller.enqueue(new Uint8Array(65 * 1024));
                controller.close();
              },
            }),
          }),
        );
        assert.equal(response.status, 413);
        assert.equal(calls.length, 0);
      },
    );
    await suite.step("unapproved origin is still denied", async () => {
      calls.length = 0;
      const response = await handleExternalPetAlertRequest(
        new Request(origin, { method: "POST", body: "{}" }),
      );
      assert.equal(response.status, 403);
      assert.equal(calls.length, 0);
    });
  } finally {
    globalThis.fetch = realFetch;
    for (const [name, value] of previous) {
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
  }
});
