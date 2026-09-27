import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Library build: React stays a peer dependency, CSS ships as one file.
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: { index: "src/index.ts", canvas: "src/canvas/index.ts", answers: "src/answers/index.ts" },
      formats: ["es"],
      cssFileName: "styles",
    },
    rollupOptions: { external: ["react", "react-dom", "react/jsx-runtime"] },
    sourcemap: true,
    emptyOutDir: true,
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
