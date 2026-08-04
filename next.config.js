/** @type {import('next').NextConfig} */

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  // Never register a SW in local next dev — it fights HMR and serves stale chunks.
  disable: process.env.NODE_ENV === "development",
  // Aggressive HTML/nav caching is what left users on deleted _next/static hashes after deploy.
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  dynamicStartUrl: false,
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    disableDevLogs: true,
    skipWaiting: true,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        urlPattern: ({ url, sameOrigin }) =>
          sameOrigin && (url.pathname === "/" || url.pathname === ""),
        handler: "NetworkFirst",
        options: {
          cacheName: "start-url",
          networkTimeoutSeconds: 3,
          expiration: {
            maxEntries: 1,
            maxAgeSeconds: 60 * 60 * 24,
          },
        },
      },
      {
        urlPattern: /^https?:\/\/.*\/(_next\/static\/).*/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "next-static-assets",
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 60 * 60 * 24 * 7,
          },
        },
      },
      {
        urlPattern: ({ request }) => request.mode === "navigate",
        handler: "NetworkFirst",
        options: {
          cacheName: "pages",
          networkTimeoutSeconds: 3,
          expiration: {
            maxEntries: 32,
            maxAgeSeconds: 60 * 60 * 24,
          },
        },
      },
      // Ads / analytics must never produce uncaught Workbox no-response errors when blocked by ad blockers.
      {
        urlPattern: /^https:\/\/(.*\.)?(google|googleadservices|googlesyndication|doubleclick|googletagmanager|google-analytics)\.(com|net)\/.*/i,
        handler: "NetworkOnly",
        options: {
          plugins: [
            {
              fetchDidFail: async () => {
                // Return empty 204 response when ad/tracking requests are blocked by client
                return new Response("", { status: 204, statusText: "No Content" });
              },
            },
          ],
        },
      },
      {
        urlPattern: /^https:\/\/.*\/api\/.*/i,
        handler: "NetworkOnly",
      },
    ],
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
      {
        // Version checking endpoint to detect new deployments
        source: "/version.json",
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
