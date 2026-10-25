import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { cp, mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import { log } from 'node:console';

const require = createRequire(import.meta.url);
const source = dirname(require.resolve('pdfjs-dist/package.json'));
const { version } = JSON.parse(await readFile(join(source, 'package.json'), 'utf8'));
const target = fileURLToPath(new URL(`../public/pdfjs/${version}/`, import.meta.url));
await mkdir(target, { recursive: true });
for (const folder of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
  await cp(join(source, folder), join(target, folder), { recursive: true });
}
await cp(join(source, 'legacy/build/pdf.worker.min.mjs'), join(target, 'pdf.worker.min.mjs'));
await cp(join(source, 'LICENSE'), join(target, 'LICENSE'));
log(`PDF reader assets prepared locally (${version}).`);
