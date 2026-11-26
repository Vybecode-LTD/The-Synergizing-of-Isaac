import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const data = fileURLToPath(new URL("../data", import.meta.url));
const dataPrefix = `${data.replaceAll("\\", "/").toLowerCase()}/`;
/** A JSON file from the repository's data/ folder, however the bundler spells the path. */
const isGameData = (id: string) => id.endsWith(".json") && id.replaceAll("\\", "/").toLowerCase().startsWith(dataPrefix);

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
    rolldownOptions: {
      output: {
        // The game data and the libraries change less often than the app, so each gets a chunk of its own:
        // the browser keeps them across a deploy that leaves them alone, loads all three at once, and no
        // file passes Vite's 500 kB warning. `npm run bundle:check` holds this in CI.
        codeSplitting: {
          groups: [
            { name: "data", test: isGameData },
            { name: "vendor", test: /[\\/]node_modules[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    // The item list is 719 tiles, which takes jsdom about four seconds under coverage on a slow machine.
    testTimeout: 15_000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/main.tsx", "src/test/**", "src/**/*.d.ts"],
      reporter: ["text-summary", "json-summary"],
      // The pull-request gate, the same floor the API's pytest run enforces.
      thresholds: { lines: 85 },
    },
  },
});
