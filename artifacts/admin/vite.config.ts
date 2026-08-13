import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { visualizer } from "rollup-plugin-visualizer";

const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    visualizer({
      filename: "dist/bundle-analysis.html",
      open: process.env.VISUALIZER_OPEN === "true",
      gzipSize: true,
      brotliSize: true,
      template: "treemap",
    }),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "attached_assets",
      ),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return;
          if (id.includes("/node_modules/react-dom") || id.includes("/node_modules/react/")) return "vendor-react";
          if (id.includes("@tanstack/react-query")) return "vendor-query";
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (id.includes("@clerk")) return "vendor-clerk";
          if (id.includes("framer-motion")) return "vendor-motion";
          if (id.includes("lucide-react")) return "vendor-icons";
          if (id.includes("@supabase")) return "vendor-supabase";
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  ssr: { noExternal: ["@workspace/ui"] },
  server: {
    port: 5174,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "0.0.0.0",
      ".repl.co",
      ".replit.dev",
      ".replit.app",
      "mustafasayed.replit.app",
    ],
    headers: {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    },
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
    fs: {
      strict: false,
      allow: [path.resolve(import.meta.dirname, "../..")],
    },
  },
  preview: {
    port: 5174,
    host: "0.0.0.0",
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "0.0.0.0",
      ".repl.co",
      ".replit.dev",
      ".replit.app",
      "mustafasayed.replit.app",
    ],
  },
});
