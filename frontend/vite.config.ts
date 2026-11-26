import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// Hai trang: landing (/) và web app (/app/, SPA dùng hash router)
export default defineConfig({
  plugins: [react()],
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
