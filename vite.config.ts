import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  preview: {
    host: "0.0.0.0",
    port: 3003,
    allowedHosts: ["planillero.arrayanhn.com"],
    strictPort: true,
  },
  // Solo si TAMBIÉN quieres acceder al dev server por dominio:
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: ["planillero.arrayanhn.com"],
    strictPort: true,
  },
});
