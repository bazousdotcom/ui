import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// The gallery is published on GitHub Pages at https://bazousdotcom.github.io/ui/.
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: process.env.GALLERY_BASE ?? "./",
  plugins: [react()],
  build: { outDir: fileURLToPath(new URL("../gallery-dist", import.meta.url)), emptyOutDir: true },
});
