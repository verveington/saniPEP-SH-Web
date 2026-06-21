import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backendProxyTarget = process.env.PORTAL_BACKEND_PROXY_TARGET ?? "http://127.0.0.1:4100";

export default defineConfig({
  root: "apps/admin",
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5184,
    proxy: {
      "/api": {
        target: backendProxyTarget,
        changeOrigin: false,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
