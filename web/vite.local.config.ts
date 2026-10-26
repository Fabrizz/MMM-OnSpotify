import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// Module page, served by the node_helper at /onspotify/ from ../page.
// The build output is committed, so the mirror never needs to build anything.
export default defineConfig({
  root: path.resolve(__dirname, "local"),
  // Relative URLs, the page lives under /onspotify/
  base: "./",
  publicDir: false,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "../page"),
    emptyOutDir: true,
  },
  server: {
    // `npm run dev:local` against a running MagicMirror
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        rewrite: (p) => `/onspotify${p}`,
        // The module only accepts requests from its own origin
        configure: (proxy) =>
          proxy.on("proxyReq", (req) => req.setHeader("origin", "http://localhost:8080")),
      },
    },
  },
})
