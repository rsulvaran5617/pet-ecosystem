/** @type {import("next").NextConfig} */
const nextConfig = {
  transpilePackages: ["@pet/types", "@pet/ui", "@pet/api-client", "@pet/config"]
};

export default nextConfig;
