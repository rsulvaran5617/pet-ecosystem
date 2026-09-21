import assert from "node:assert/strict";
import {
  backfill,
  cleanup,
  createPort,
  type MaintenancePort,
  parseOptions,
  readPhoto,
} from "./pet-sos-media-maintenance.ts";

const id = "00000000-0000-0000-0000-000000000001";
function fixture(fail = "") {
  const calls: string[] = [];
  const port: MaintenancePort = {
    rpc<T>(name: string): Promise<T> {
      calls.push(name);
      if (name === fail) return Promise.reject(new Error("private error"));
      return Promise.resolve(
        (name === "prepare_pet_sos_media_backfill"
          ? {
            id,
            status: "processing",
            source_path: "source",
            display_path: "display",
            thumbnail_path: "thumb",
          }
          : { id, storage_path: "orphan" }) as T,
      );
    },
    download() {
      calls.push("download");
      return Promise.resolve({ bytes: new Uint8Array([1]), mime: "image/png" });
    },
    upload(path) {
      calls.push(`upload:${path}`);
      if (path === fail) return Promise.reject(new Error("upload failure"));
      return Promise.resolve();
    },
    remove() {
      calls.push("remove");
      if (fail === "remove") {
        return Promise.reject(new Error("delete uncertain"));
      }
      return Promise.resolve();
    },
  };
  return { calls, port };
}
const sanitize = () =>
  Promise.resolve({
    display: new Uint8Array([2]),
    thumbnail: new Uint8Array([3]),
    width: 1,
    height: 1,
    mimeType: "image/jpeg" as const,
  });

Deno.test("maintenance is explicit, bounded and failure conservative", async (suite) => {
  await suite.step("inventory is default and target project mandatory", () => {
    assert.equal(
      parseOptions(["--confirm-project=fixture"], "https://fixture.supabase.co")
        .apply,
      false,
    );
    for (
      const url of [
        "https://other.supabase.co",
        "http://fixture.supabase.co",
        "https://fixture.supabase.co/other",
        "https://fixture.supabase.co?x=1",
      ]
    ) {
      assert.throws(() => parseOptions(["--confirm-project=fixture"], url));
    }
    assert.throws(() =>
      parseOptions(
        ["--confirm-project=fixture", "--mode=cleanup", "--apply"],
        "https://fixture.supabase.co",
      )
    );
    assert.throws(() =>
      parseOptions([
        "--confirm-project=fixture",
        "--mode=backfill",
        "--apply",
        "--reviewed",
        `--id=${id}`,
        "--kind=owner",
      ], "https://fixture.supabase.co")
    );
  });
  await suite.step(
    "backfill sanitizes before immutable uploads and finalization",
    async () => {
      const { calls, port } = fixture();
      assert.equal(await backfill(port, "community", id, sanitize), "ready");
      assert.deepEqual(calls, [
        "prepare_pet_sos_media_backfill",
        "download",
        "upload:display",
        "upload:thumb",
        "finalize_pet_sos_media_backfill",
      ]);
    },
  );
  await suite.step("codec failure never uploads", async () => {
    const { calls, port } = fixture();
    await assert.rejects(() =>
      backfill(
        port,
        "external",
        id,
        () => Promise.reject(new Error("bad photo")),
      )
    );
    assert.deepEqual(calls, [
      "prepare_pet_sos_media_backfill",
      "download",
      "abort_pet_sos_media_backfill",
    ]);
  });
  for (const fail of ["thumb", "finalize_pet_sos_media_backfill"]) {
    await suite.step(
      `${fail} leaves files for separately claimed cleanup`,
      async () => {
        const { calls, port } = fixture(fail);
        await assert.rejects(() => backfill(port, "external", id, sanitize));
        assert.equal(calls.at(-1), "abort_pet_sos_media_backfill");
        assert.ok(!calls.includes("remove"));
      },
    );
  }
  await suite.step(
    "cleanup claims before delete and confirms after",
    async () => {
      const { calls, port } = fixture();
      assert.equal(await cleanup(port, id, "2026-09-01T00:00:00Z"), "deleted");
      assert.deepEqual(calls, [
        "claim_pet_sos_orphan",
        "remove",
        "finish_pet_sos_orphan_cleanup",
      ]);
    },
  );
  await suite.step("failed claim cannot delete", async () => {
    const { calls, port } = fixture("claim_pet_sos_orphan");
    await assert.rejects(() => cleanup(port, id, "2026-09-01T00:00:00Z"));
    assert.deepEqual(calls, ["claim_pet_sos_orphan"]);
  });
  await suite.step(
    "uncertain deletion cannot be reported successful",
    async () => {
      const { calls, port } = fixture("remove");
      await assert.rejects(() => cleanup(port, id, "2026-09-01T00:00:00Z"));
      assert.deepEqual(calls, ["claim_pet_sos_orphan", "remove"]);
    },
  );
  await suite.step(
    "actual streamed byte limit and MIME whitelist",
    async () => {
      await assert.rejects(() =>
        readPhoto(
          new Response(new Uint8Array(5242881), {
            headers: { "Content-Type": "image/jpeg", "Content-Length": "1" },
          }),
        )
      );
      await assert.rejects(() =>
        readPhoto(
          new Response("<svg/>", {
            headers: { "Content-Type": "image/svg+xml" },
          }),
        )
      );
    },
  );
  await suite.step(
    "transport confines bucket, rejects redirects and forbids upsert",
    async () => {
      const port = createPort(
        "https://fixture.supabase.co",
        "fixture",
        (input, init) => {
          const req = new Request(input, init);
          assert.equal(
            req.url,
            "https://fixture.supabase.co/storage/v1/object/pet-alert-media/report/photo.jpg",
          );
          assert.equal(req.redirect, "error");
          assert.equal(req.headers.get("x-upsert"), "false");
          return Promise.resolve(Response.json({}));
        },
      );
      await port.upload("report/photo.jpg", new Uint8Array([1]));
      await assert.rejects(() =>
        port.upload("../photo.jpg", new Uint8Array([1]))
      );
    },
  );
});
