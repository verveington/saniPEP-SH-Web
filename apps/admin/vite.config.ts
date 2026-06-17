import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "apps/admin",
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5184,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
