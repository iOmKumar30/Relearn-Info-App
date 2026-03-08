/** @type {import('next').NextConfig} */
const nextConfig: import("next").NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],
  eslint: {
    // This will allow production builds to successfully complete
    // even if there are ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
