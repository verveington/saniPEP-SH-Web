import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "apps/design-lab",
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5185,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
