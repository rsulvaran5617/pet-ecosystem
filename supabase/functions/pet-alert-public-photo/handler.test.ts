import assert from "node:assert/strict";
import { handlePublicPhotoRequest } from "./handler.ts";

Deno.test("public gateway checks current visibility without signing or leaking secrets", async (suite) => {
  const env = {
    PET_ALERT_PUBLIC_MEDIA_ENABLED: "true",
    SUPABASE_URL: "https://fixture.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "fixture",
  };
  const previous = Object.fromEntries(
    Object.keys(env).map((key) => [key, Deno.env.get(key)]),
  );
  for (const [key, value] of Object.entries(env)) Deno.env.set(key, value);
  const realFetch = globalThis.fetch;
  const path = "owner-sos-v1/fixture/display.jpg";
  const calls: string[] = [];
  let mode = "ready", resolutions = 0;
  globalThis.fetch = async (input, init) => {
    const req = new Request(input, init);
    const url = new URL(req.url);
    calls.push(url.pathname);
    if (url.pathname.endsWith("/resolve_pet_sos_public_photo")) {
      assert.deepEqual(await req.json(), { target_path: path });
      resolutions++;
      return Response.json(
        mode === "hidden" || (mode === "withdrawn" && resolutions === 2)
          ? null
          : path,
      );
    }
    assert.ok(url.pathname.startsWith("/storage/v1/object/pet-alert-media/"));
    assert.equal(req.redirect, "error");
    return new Response(
      mode === "oversized"
        ? new Uint8Array(5242881)
        : new Uint8Array([255, 216, 255, 217]),
      {
        headers: {
          "content-type": mode === "mime" ? "text/html" : "image/jpeg",
        },
      },
    );
  };
  const request = () =>
    new Request(
      `https://fixture.invalid/photo?path=${encodeURIComponent(path)}`,
    );
  try {
    for (const name of ["ready", "hidden", "withdrawn", "oversized", "mime"]) {
      await suite.step(name, async () => {
        mode = name;
        resolutions = 0;
        calls.length = 0;
        const response = await handlePublicPhotoRequest(request());
        assert.equal(response.status, name === "ready" ? 200 : 404);
        assert.match(response.headers.get("cache-control") ?? "", /no-store/);
        assert.equal(response.headers.has("location"), false);
        if (name === "hidden") assert.equal(calls.length, 1);
        if (name === "withdrawn") assert.equal(resolutions, 2);
        if (name === "ready") {
          assert.equal(resolutions, 2);
          assert.equal(response.headers.get("content-type"), "image/jpeg");
          assert.equal((await response.arrayBuffer()).byteLength, 4);
        } else assert.equal((await response.arrayBuffer()).byteLength, 0);
      });
    }
    await suite.step(
      "disabled and unsafe paths do not reach backend",
      async () => {
        calls.length = 0;
        assert.equal(
          (await handlePublicPhotoRequest(
            new Request("https://fixture.invalid/photo?path=../secret.jpg"),
          )).status,
          404,
        );
        Deno.env.delete("PET_ALERT_PUBLIC_MEDIA_ENABLED");
        assert.equal((await handlePublicPhotoRequest(request())).status, 404);
        assert.equal(calls.length, 0);
      },
    );
  } finally {
    globalThis.fetch = realFetch;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  }
});
