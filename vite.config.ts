import path from "path";

import react from "@vitejs/plugin-react-swc";
import { componentTagger } from "lovable-tagger";
import { defineConfig } from "vite";
import { compression } from "vite-plugin-compression2";

// https://vitejs.dev/config/
const BUILD_ID = `${new Date().toISOString()}-${Math.random().toString(36).slice(2, 8)}`;

export default defineConfig(({ mode }) => ({
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Gzip compression (enabled in production builds)
    mode === "production" && compression({
      algorithms: ["gzip"],
      threshold: 1024,
    }),
    // Brotli compression (enabled in production builds)
    mode === "production" && compression({
      algorithms: ["brotliCompress"],
      threshold: 1024,
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@lib": path.resolve(__dirname, "./src/lib"),
      "@hooks": path.resolve(__dirname, "./src/hooks"),
      "@pages": path.resolve(__dirname, "./src/pages"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    sourcemap: false,
    cssCodeSplit: true,
    minify: "esbuild",
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {},
    },
  },
  esbuild: {
    // Drop console logs and debugger statements in production
    drop: mode === "production" ? ["console", "debugger"] : [],
  },
}));
