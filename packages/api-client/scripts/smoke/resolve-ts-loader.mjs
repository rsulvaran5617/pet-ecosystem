import path from "node:path";

function isExtensionlessRelativeSpecifier(specifier) {
  return (specifier.startsWith("./") || specifier.startsWith("../")) && path.extname(specifier) === "";
}

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (!isExtensionlessRelativeSpecifier(specifier)) {
      throw error;
    }

    return nextResolve(`${specifier}.ts`, context);
  }
}
