/** @type {import('next').NextConfig} */

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: false,
  workboxOptions: {
    disableDevLogs: true,
    // New SW activates immediately on deployment — no need to close all tabs.
    skipWaiting: true,
    clientsClaim: true,
  },
});

const nextConfig = {
  async headers() {
    return [
      {
        // Prevent browsers from caching the service worker file.
        // A stale sw.js prevents users from receiving new deployments
        // without manually clearing cache or using Incognito mode.
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
        ],
      },
      {
        // Workbox precache manifest must also never be cached at the HTTP layer
        // so that the updated SW picks up the new asset manifest immediately.
        source: "/workbox-:hash.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
    ],
  },
  // Barrel-file libraries (antd, icon packs) pull in thousands of modules per
  // import. `optimizePackageImports` rewrites these to import only what is
  // actually used, which sharply reduces the amount of JS compiled per route
  // (faster dev compiles) and shipped to the browser (faster navigation).
  experimental: {
    optimizePackageImports: [
      "antd",
      "@ant-design/icons",
      "react-icons",
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = withPWA(nextConfig);
