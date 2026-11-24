import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const data = fileURLToPath(new URL("../data", import.meta.url));

// The API runs on 8001 locally: Windows reserves 8000 on the owner's machine.
const api = process.env.VITE_API_PROXY ?? "http://127.0.0.1:8001";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@data": data },
  },
  server: {
    // 5173 is usually taken by another project on this machine.
    port: 5273,
    strictPort: true,
    fs: { allow: [fileURLToPath(new URL("..", import.meta.url))] },
    proxy: { "/api": api },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/main.tsx", "src/test/**", "src/**/*.d.ts"],
      reporter: ["text-summary", "json-summary"],
    },
  },
});
