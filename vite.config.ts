/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react(), tailwindcss()],

  // Opciones pensadas para Tauri (solo aplican con `tauri dev` / `tauri build`)
  // 1. no ocultar los errores de Rust
  clearScreen: false,
  // 2. Tauri espera un puerto fijo
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    // 3. no vigilar src-tauri
    watch: { ignored: ["**/src-tauri/**"] },
  },

  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
}));
