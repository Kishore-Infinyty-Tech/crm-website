import type { NextConfig } from "next";

// All /api/* calls from the browser are forwarded to the Django backend, so the
// login cookie is same-origin and no CORS setup is needed.
// 127.0.0.1 on purpose: on Windows "localhost" tries IPv6 first and adds ~2 seconds per request.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8001";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;
