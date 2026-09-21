// Test-only worker: generate synthetic images without weakening the production codec policy.
import {
  ImageMagick,
  initializeImageMagick,
  MagickColors,
  MagickFormat,
  MagickImage,
  MagickImageCollection,
  Orientation,
} from "npm:@imagemagick/magick-wasm@0.0.43";
await initializeImageMagick(
  await Deno.readFile(
    new URL(
      import.meta.resolve("npm:@imagemagick/magick-wasm@0.0.43/magick.wasm"),
    ),
  ),
);

function exif() {
  const data = new Uint8Array(98);
  data.set(new TextEncoder().encode("Exif\0\0II"));
  const view = new DataView(data.buffer, 6);
  view.setUint16(2, 42, true);
  view.setUint32(4, 8, true);
  view.setUint16(8, 2, true);
  view.setUint16(10, 0x112, true);
  view.setUint16(12, 3, true);
  view.setUint32(14, 1, true);
  view.setUint16(18, 6, true);
  view.setUint16(22, 0x8825, true);
  view.setUint16(24, 4, true);
  view.setUint32(26, 1, true);
  view.setUint32(30, 38, true);
  view.setUint16(38, 2, true);
  view.setUint16(40, 1, true);
  view.setUint16(42, 2, true);
  view.setUint32(44, 2, true);
  view.setUint8(48, 78);
  view.setUint16(52, 2, true);
  view.setUint16(54, 5, true);
  view.setUint32(56, 3, true);
  view.setUint32(60, 68, true);
  for (const [i, value] of [8, 30, 0].entries()) {
    view.setUint32(68 + i * 8, value, true);
    view.setUint32(72 + i * 8, 1, true);
  }
  return data;
}

function fixture(
  format: MagickFormat,
  width: number,
  height: number,
  metadata = false,
) {
  return ImageMagick.read(MagickColors.Red, width, height, (image) => {
    if (metadata) {
      image.setProfile("exif", exif());
      image.orientation = Orientation.RightTop;
      image.setProfile(
        "xmp",
        new TextEncoder().encode(
          '<x:xmpmeta xmlns:x="adobe:ns:meta/">PRIVATE-SOS-FIXTURE</x:xmpmeta>',
        ),
      );
      const caption = new TextEncoder().encode("PRIVATE-SOS-FIXTURE");
      image.setProfile(
        "iptc",
        new Uint8Array([0x1c, 2, 120, 0, caption.length, ...caption]),
      );
      image.setAttribute("comment", "PRIVATE-SOS-FIXTURE");
    }
    return image.write(format, (bytes) => Uint8Array.from(bytes));
  });
}

const animation = MagickImageCollection.create();
animation.push(MagickImage.create(MagickColors.Red, 10, 10));
animation.push(MagickImage.create(MagickColors.Blue, 10, 10));
const animatedWebp = animation.write(
  MagickFormat.WebP,
  (bytes) => Uint8Array.from(bytes),
);
animation.dispose();

globalThis.postMessage({
  png: fixture(MagickFormat.Png, 1, 1),
  jpegMetadata: fixture(MagickFormat.Jpeg, 60, 30, true),
  pngMetadata: fixture(MagickFormat.Png, 60, 30, true),
  webpMetadata: fixture(MagickFormat.WebP, 60, 30, true),
  large: fixture(MagickFormat.Jpeg, 2400, 1200),
  excessivePixels: fixture(MagickFormat.Png, 4000, 3001),
  animatedWebp,
});
globalThis.close();
