import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "apps/portal",
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5183,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4100",
        changeOrigin: false,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
