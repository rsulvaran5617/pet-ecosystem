import {
  AlphaAction,
  ColorSpace,
  ConfigurationFiles,
  ImageMagick,
  initializeImageMagick,
  MagickColors,
  MagickFormat,
  MagickGeometry,
  MagickImageCollection,
} from "npm:@imagemagick/magick-wasm@0.0.43";

export const PET_ALERT_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const MAX_PIXELS = 12_000_000;
const MAX_OUTPUT_BYTES = 5 * 1024 * 1024;
const formats = new Map([
  ["image/jpeg", MagickFormat.Jpeg],
  ["image/png", MagickFormat.Png],
  ["image/webp", MagickFormat.WebP],
]);

export class PetAlertPhotoError extends Error {
  constructor() {
    super("PET_ALERT_PHOTO_INVALID");
    this.name = "PetAlertPhotoError";
  }
}

export interface SanitizedPetAlertPhoto {
  display: Uint8Array;
  thumbnail: Uint8Array;
  mimeType: "image/jpeg";
  width: number;
  height: number;
}

let initialization: Promise<void> | undefined;

async function initialize() {
  const configuration = ConfigurationFiles.default;
  // Deny delegates, indirect file reads and every decoder except the photo formats.
  configuration.policy.data = `<policymap>
    <policy domain="delegate" rights="none" pattern="*"/>
    <policy domain="filter" rights="none" pattern="*"/>
    <policy domain="path" rights="none" pattern="@*"/>
    <policy domain="coder" rights="none" pattern="*"/>
    <policy domain="coder" rights="read|write" pattern="{JPEG,PNG,WEBP}"/>
    <policy domain="resource" name="width" value="12000"/>
    <policy domain="resource" name="height" value="12000"/>
    <policy domain="resource" name="list-length" value="2"/>
    <policy domain="resource" name="memory" value="128MiB"/>
    <policy domain="resource" name="map" value="0"/>
    <policy domain="resource" name="disk" value="0"/>
    <policy domain="resource" name="thread" value="1"/>
  </policymap>`;
  const wasm = await Deno.readFile(
    new URL("./generated/magick.wasm", import.meta.url),
  );
  await initializeImageMagick(wasm, configuration);
}

/** Only in-memory bytes. No URLs, storage paths, Pet IDs or caller-provided permissions. */
export async function sanitizePetAlertPhoto(
  bytes: Uint8Array,
  declaredMimeType: string,
): Promise<SanitizedPetAlertPhoto> {
  const format = formats.get(declaredMimeType);
  if (
    !format || bytes.byteLength === 0 ||
    bytes.byteLength > PET_ALERT_PHOTO_MAX_BYTES
  ) {
    throw new PetAlertPhotoError();
  }
  // Initialization failure is operational, not an invalid user photo. Never fall back to original bytes.
  await (initialization ??= initialize());
  try {
    const images = MagickImageCollection.create();
    try {
      images.ping(bytes);
      if (images.length !== 1) throw new PetAlertPhotoError();
      const info = images[0];
      if (
        info.format !== format || info.width < 1 || info.height < 1 ||
        info.width * info.height > MAX_PIXELS
      ) throw new PetAlertPhotoError();
    } finally {
      images.dispose();
    }

    return ImageMagick.read(bytes, format, (image) => {
      image.autoOrient();
      image.colorSpace = ColorSpace.sRGB;
      image.backgroundColor = MagickColors.White;
      image.alpha(AlphaAction.Remove);
      image.strip();
      for (const name of image.attributeNames) image.removeAttribute(name);
      image.resize(new MagickGeometry("1600x1600>"));
      image.quality = 85;
      const width = image.width;
      const height = image.height;
      const display = image.write(
        MagickFormat.Jpeg,
        (data) => Uint8Array.from(data),
      );
      image.resize(new MagickGeometry("480x480>"));
      image.quality = 80;
      const thumbnail = image.write(
        MagickFormat.Jpeg,
        (data) => Uint8Array.from(data),
      );
      if (
        display.length === 0 || display.length > MAX_OUTPUT_BYTES ||
        thumbnail.length === 0 || thumbnail.length > MAX_OUTPUT_BYTES
      ) throw new PetAlertPhotoError();
      return { display, thumbnail, mimeType: "image/jpeg", width, height };
    });
  } catch {
    // Codec errors can contain metadata. Return a stable code, never raw diagnostics.
    throw new PetAlertPhotoError();
  }
}
