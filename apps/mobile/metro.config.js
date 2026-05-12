const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules")
];
config.resolver.unstable_enableSymlinks = true;

const defaultResolveRequest = config.resolver.resolveRequest;
const mapLibreEntry = require.resolve("@maplibre/maplibre-react-native", {
  paths: [path.resolve(projectRoot, "node_modules")]
});

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const normalizedModuleName = moduleName.replaceAll("\\", "/");
  if (
    moduleName === "@maplibre/maplibre-react-native" ||
    (normalizedModuleName.includes("@maplibre+maplibre-react-native") &&
      normalizedModuleName.endsWith("/node_modules/@maplibre/maplibre-react-native/lib/commonjs/index"))
  ) {
    return {
      type: "sourceFile",
      filePath: mapLibreEntry
    };
  }

  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
