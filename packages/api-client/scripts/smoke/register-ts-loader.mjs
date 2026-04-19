import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./scripts/smoke/resolve-ts-loader.mjs", pathToFileURL("./"));
