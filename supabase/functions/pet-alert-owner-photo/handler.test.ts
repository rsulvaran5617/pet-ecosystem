import assert from "node:assert/strict";
import { handleOwnerPhotoRequest } from "./handler.ts";
const alertId = "00000000-0000-0000-0000-000000000001";
const actor = "00000000-0000-0000-0000-000000000002";
const pet = "00000000-0000-0000-0000-000000000003";
const attempt = "00000000-0000-0000-0000-000000000004";
const prefix = `owner-sos-v1/${alertId}/${attempt}`;
const paths = [`${prefix}/display.jpg`, `${prefix}/thumbnail.jpg`];

Deno.test("owner avatar derivatives: authorization, bounded source and safe compensation", async (suite) => {
  const env = {
    PET_ALERT_OWNER_DERIVATIVES_ENABLED: "true",
    SUPABASE_URL: "https://fixture.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "fixture",
    PET_ALERT_ALLOWED_ORIGINS: "https://app.invalid",
  };
  const oldEnv = Object.fromEntries(
    Object.keys(env).map((name) => [name, Deno.env.get(name)]),
  );
  for (const [name, value] of Object.entries(env)) Deno.env.set(name, value);
  const originalFetch = globalThis.fetch;
  const worker = new Worker(
    new URL("../_shared/pet-alert-media.fixtures.ts", import.meta.url).href,
    { type: "module" },
  );
  let mode = "success";
  const calls: string[] = [];
  const uploads: Uint8Array[] = [];
  try {
    const source = await new Promise<Uint8Array>((resolve, reject) => {
      worker.onmessage = (event) => resolve(event.data.pngMetadata);
      worker.onerror = (event) => {
        event.preventDefault();
        reject(new Error(event.message));
      };
    });
    worker.terminate();
    globalThis.fetch = async (input, init) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      calls.push(`${request.method} ${url.pathname}`);
      if (url.pathname === "/auth/v1/user") {
        return mode === "bad-jwt"
          ? Response.json({ message: "Invalid" }, { status: 401 })
          : Response.json({ id: actor });
      }
      if (url.pathname.endsWith("/prepare_pet_alert_owner_photo")) {
        assert.deepEqual(await request.json(), {
          target_alert_id: alertId,
          target_actor_id: actor,
          photo_consent: true,
        });
        if (mode === "foreign") {
          return Response.json({ message: "PET_ALERT_UNAUTHORIZED" }, {
            status: 400,
          });
        }
        return Response.json({
          pet_id: pet,
          attempt_id: attempt,
          source_path: `${pet}/photo.png`,
          display_path: paths[0],
          thumbnail_path: paths[1],
          status: mode === "replay" ? "ready" : "processing",
        });
      }
      if (
        url.pathname.startsWith("/storage/v1/object/pet-avatars/")
      ) {
        assert.equal(request.redirect, "error");
        const content = mode === "oversized"
          ? new Uint8Array(5242881)
          : mode === "corrupt"
          ? new Uint8Array([1, 2])
          : source;
        return new Response(Uint8Array.from(content), {
          headers: { "content-type": "image/png" },
        });
      }
      if (url.pathname.endsWith("/finalize_pet_alert_owner_photo")) {
        if (mode === "stale") {
          return Response.json({ message: "PET_ALERT_PHOTO_STALE" }, {
            status: 400,
          });
        }
        if (mode.startsWith("uncertain")) {
          return Response.json({ message: "Unknown" }, { status: 500 });
        }
        return Response.json(null);
      }
      if (url.pathname.endsWith("/abort_pet_alert_owner_photo")) {
        if (mode === "uncertain-abort") {
          return Response.json({ message: "Unknown" }, { status: 500 });
        }
        return Response.json(mode === "uncertain-finalize" ? null : paths);
      }
      if (request.method === "DELETE") {
        const body = await request.json();
        assert.deepEqual(body.prefixes, paths);
        return Response.json([]);
      }
      if (url.pathname.startsWith("/storage/v1/object/pet-alert-media/")) {
        assert.equal(request.headers.get("content-type"), "image/jpeg");
        assert.equal(request.headers.get("x-upsert"), "false");
        uploads.push(new Uint8Array(await request.arrayBuffer()));
        if (mode === "second-upload" && uploads.length === 2) {
          return Response.json({ message: "Storage unavailable" }, {
            status: 400,
          });
        }
        return Response.json({ Key: "fixture" });
      }
      throw new Error(`Unexpected mock path ${url.pathname}`);
    };
    const request = (
      body: unknown = { alertId, photoConsent: true },
      headers: Record<string, string> = {},
    ) =>
      new Request("https://fixture.invalid/owner", {
        method: "POST",
        headers: {
          authorization: "Bearer fixture",
          "content-type": "application/json",
          ...headers,
        },
        body: JSON.stringify(body),
      });
    for (
      const testMode of [
        "bad-jwt",
        "foreign",
        "success",
        "replay",
        "corrupt",
        "oversized",
        "stale",
        "second-upload",
        "uncertain-finalize",
        "uncertain-abort",
      ]
    ) {
      await suite.step(testMode, async () => {
        mode = testMode;
        calls.length = 0;
        uploads.length = 0;
        const response = await handleOwnerPhotoRequest(request());
        const expected = mode === "bad-jwt"
          ? 401
          : mode === "foreign"
          ? 403
          : ["success", "replay"].includes(mode)
          ? 200
          : ["corrupt", "oversized"].includes(mode)
          ? 400
          : mode === "stale"
          ? 409
          : 503;
        assert.equal(response.status, expected);
        if (expected === 200) {
          assert.deepEqual(await response.json(), { status: "ready" });
        }
        if (mode === "success") {
          assert.equal(uploads.length, 2);
          for (const bytes of uploads) {
            assert.equal(bytes[0], 0xff);
            assert.equal(bytes[1], 0xd8);
            assert.notDeepEqual(bytes, source);
          }
          assert.ok(!calls.some((call) => call.startsWith("DELETE")));
        }
        if (["bad-jwt", "foreign", "replay"].includes(mode)) {
          assert.ok(!calls.some((call) => call.includes("/storage/")));
        }
        if (mode.startsWith("uncertain")) {
          assert.ok(!calls.some((call) => call.startsWith("DELETE")));
        }
        if (["stale", "second-upload"].includes(mode)) {
          assert.ok(calls.some((call) => call.startsWith("DELETE")));
        }
      });
    }
    await suite.step(
      "explicit consent, strict payload and safe origins",
      async () => {
        mode = "success";
        for (
          const body of [{ alertId }, { alertId, photoConsent: false }, {
            alertId,
            photoConsent: true,
            sourceUrl: "https://evil.invalid",
          }, { alertId, photoConsent: true, extra: "x".repeat(2048) }]
        ) {
          calls.length = 0;
          assert.equal(
            (await handleOwnerPhotoRequest(request(body))).status,
            400,
          );
          assert.ok(
            !calls.some((call) =>
              call.includes("/rpc/") || call.includes("/storage/")
            ),
          );
        }
        calls.length = 0;
        assert.equal(
          (await handleOwnerPhotoRequest(
            request(undefined, { origin: "https://evil.invalid" }),
          )).status,
          403,
        );
        assert.equal(calls.length, 0);
      },
    );
    await suite.step("disabled by default, no service call", async () => {
      Deno.env.delete("PET_ALERT_OWNER_DERIVATIVES_ENABLED");
      calls.length = 0;
      assert.equal((await handleOwnerPhotoRequest(request())).status, 503);
      assert.equal(calls.length, 0);
    });
  } finally {
    worker.terminate();
    globalThis.fetch = originalFetch;
    for (const [name, value] of Object.entries(oldEnv)) {
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
  }
});
