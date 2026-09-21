import assert from "node:assert/strict";
import { ImageMagick, MagickFormat } from "npm:@imagemagick/magick-wasm@0.0.43";
import {
  PET_ALERT_PHOTO_MAX_BYTES,
  PetAlertPhotoError,
  sanitizePetAlertPhoto,
} from "./pet-alert-media.ts";

async function fixtures(): Promise<Record<string, Uint8Array>> {
  const worker = new Worker(
    new URL("./pet-alert-media.fixtures.ts", import.meta.url).href,
    { type: "module" },
  );
  try {
    return await new Promise((resolve, reject) => {
      worker.onmessage = (event) => resolve(event.data);
      worker.onerror = (event) => {
        event.preventDefault();
        reject(new Error(event.message));
      };
    });
  } finally {
    worker.terminate();
  }
}

Deno.test("photo sanitizer: actual decoder, metadata privacy and limits", async (suite) => {
  const samples = await fixtures();
  const png = samples.png;
  // Initializes the restricted codec; does not require a server, storage or credentials.
  await sanitizePetAlertPhoto(png, "image/png");
  for (
    const [key, mime] of [["jpegMetadata", "image/jpeg"], [
      "pngMetadata",
      "image/png",
    ], ["webpMetadata", "image/webp"]] as const
  ) {
    await suite.step(
      `${mime}: EXIF/GPS/XMP/comments removed from both derivatives`,
      async () => {
        const source = samples[key];
        ImageMagick.read(source, (image) => {
          assert.ok(image.profileNames.includes("exif"));
          assert.ok(image.profileNames.includes("xmp"));
          if (mime === "image/jpeg") {
            assert.ok(image.profileNames.includes("iptc"));
          }
          assert.ok(image.getAttribute("exif:GPSLatitude"));
        });
        const result = await sanitizePetAlertPhoto(source, mime);
        assert.equal(result.mimeType, "image/jpeg");
        for (const bytes of [result.display, result.thumbnail]) {
          assert.equal(
            new TextDecoder().decode(bytes).includes("PRIVATE-SOS-FIXTURE"),
            false,
          );
          ImageMagick.read(bytes, (image) => {
            assert.equal(image.format, MagickFormat.Jpeg);
            assert.equal(image.profileNames.length, 0);
            assert.equal(image.getAttribute("exif:GPSLatitude"), null);
            assert.equal(image.getAttribute("comment"), null);
          });
        }
      },
    );
  }
  await suite.step(
    "orientation is applied before metadata removal, without enlarging",
    async () => {
      const result = await sanitizePetAlertPhoto(
        samples.jpegMetadata,
        "image/jpeg",
      );
      assert.equal(result.width, 30);
      assert.equal(result.height, 60);
    },
  );
  await suite.step("display and thumbnail fit without cropping", async () => {
    const source = samples.large;
    const result = await sanitizePetAlertPhoto(source, "image/jpeg");
    assert.equal(result.width, 1600);
    assert.equal(result.height, 800);
    ImageMagick.read(result.thumbnail, (image) => {
      assert.equal(image.width, 480);
      assert.equal(image.height, 240);
    });
  });
  await suite.step(
    "empty, oversized, corrupt, MIME mismatch and SVG fail closed",
    async () => {
      for (
        const [bytes, mime] of [
          [new Uint8Array(), "image/jpeg"],
          [new Uint8Array(PET_ALERT_PHOTO_MAX_BYTES + 1), "image/jpeg"],
          [new Uint8Array([255, 216, 255, 0]), "image/jpeg"],
          [png, "image/jpeg"],
          [png, "text/plain"],
          [
            new TextEncoder().encode(
              '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>',
            ),
            "image/png",
          ],
        ] as const
      ) {
        await assert.rejects(
          () => sanitizePetAlertPhoto(bytes, mime),
          PetAlertPhotoError,
        );
      }
    },
  );
  await suite.step(
    "pixel limit rejects compact high-resolution input",
    async () => {
      const source = samples.excessivePixels;
      await assert.rejects(
        () => sanitizePetAlertPhoto(source, "image/png"),
        PetAlertPhotoError,
      );
    },
  );
  await suite.step(
    "animated WebP is rejected rather than silently taking the first frame",
    async () => {
      await assert.rejects(
        () => sanitizePetAlertPhoto(samples.animatedWebp, "image/webp"),
        PetAlertPhotoError,
      );
    },
  );
  await suite.step(
    "a rejected input does not break a later request in the same isolate",
    async () => {
      assert.ok(
        (await sanitizePetAlertPhoto(png, "image/png")).display.byteLength > 0,
      );
    },
  );
});
