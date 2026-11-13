/** @type {import('next').NextConfig} */
const isDevelopment = process.env.NODE_ENV === "development";
const isProduction = process.env.NODE_ENV === "production";

const fallbackContentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  // Next.js development bundles use eval; production must not allow it.
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""} https://checkout.razorpay.com https://challenges.cloudflare.com https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${isDevelopment ? " ws: wss:" : ""} https://challenges.cloudflare.com https://*.razorpay.com https://*.uploadthing.com https://*.ingest.uploadthing.com https://*.ufs.sh https://utfs.io https://*.utfs.io https://va.vercel-scripts.com https://*.vercel-insights.com`,
  "frame-src https://challenges.cloudflare.com https://*.razorpay.com https://drive.google.com https://docs.google.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: fallbackContentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), geolocation=(), microphone=(), usb=()",
          },
          ...(isProduction
            ? [{ key: "Strict-Transport-Security", value: "max-age=63072000" }]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
