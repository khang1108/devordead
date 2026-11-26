import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

const API_PROXY_TARGET = process.env.VITE_PROXY_TARGET ?? "http://127.0.0.1:8000";

// Hai trang: landing (/) và web app (/app/, SPA dùng hash router)
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: API_PROXY_TARGET,
        changeOrigin: true,
      },
      "/ws": {
        target: API_PROXY_TARGET.replace(/^http/, "ws"),
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      "@landing": resolve(import.meta.dirname, "src/landing"),
      "@app": resolve(import.meta.dirname, "src/app"),
      "@shared": resolve(import.meta.dirname, "src/shared"),
      "@features": resolve(import.meta.dirname, "src/features"),
    },
  },
  build: {
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        app: resolve(import.meta.dirname, "app/index.html"),
      },
    },
  },
});
