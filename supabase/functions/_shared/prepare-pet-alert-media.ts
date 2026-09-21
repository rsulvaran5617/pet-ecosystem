import "npm:@imagemagick/magick-wasm@0.0.43";

// Generated build asset, not source-controlled. Use the function's frozen lockfile.
const source = new URL(import.meta.resolve("npm:@imagemagick/magick-wasm@0.0.43/magick.wasm"));
const directory = new URL("./generated/", import.meta.url);
await Deno.mkdir(directory, { recursive: true });
const bytes = await Deno.readFile(source);
await Deno.writeFile(new URL("magick.wasm", directory), bytes);
const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
console.log("Prepared SOS codec 0.0.43:", bytes.length, "bytes; SHA256", Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join(""));
