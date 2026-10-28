import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  worker: { format: "es" },
  optimizeDeps: {
    exclude: ["@daily-co/daily-js"],
    // The editor is lazy-loaded, so the dev server would only find these mid-session and
    // reload every open page to re-bundle them; pre-bundle them at startup instead.
    include: ["@uiw/react-codemirror", "@codemirror/lang-python", "@codemirror/language", "@lezer/highlight"],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    exclude: ["**/node_modules/**", "**/backend/**", "e2e/**"],
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
