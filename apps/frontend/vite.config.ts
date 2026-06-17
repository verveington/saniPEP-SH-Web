import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "apps/frontend",
  plugins: [react()],
  define: {
    __SANIPEP_PUBLIC_BUILD__: "true",
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
