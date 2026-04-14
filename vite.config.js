import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vite";

function normalizeBasePath(value) {
  if (!value || value === "/") {
    return "/";
  }

  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
const basePath = normalizeBasePath(
  process.env.VITE_BASE_PATH ||
    (process.env.GITHUB_PAGES === "true" && repositoryName ? repositoryName : "/")
);

export default defineConfig({
  base: basePath,
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      manifest: {
        name: "TrackIndexes",
        short_name: "TrackIndexes",
        description: "Near-realtime NIFTY 50 and SENSEX tracker with local-first persistence.",
        theme_color: "#0f1720",
        background_color: "#07111b",
        display: "standalone",
        start_url: basePath,
        scope: basePath,
        icons: [
          {
            src: "icons/icon-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any maskable"
          },
          {
            src: "icons/icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"]
      }
    })
  ]
});
