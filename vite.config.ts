import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { resolve } from "path";

const view = process.env.VITE_VIEW || "budget";

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  root: "src/views",
  build: {
    outDir: "../../dist-views",
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(process.cwd(), `src/views/${view}.html`),
    },
  },
});
