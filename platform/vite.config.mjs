import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const packageRoot = resolve(import.meta.dirname, "..");
const { demoProject } = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8"));

export default defineConfig({
  root: resolve(packageRoot, demoProject),
  plugins: [react()],
  server: { host: "127.0.0.1" },
  preview: { host: "127.0.0.1" },
  build: { outDir: resolve(packageRoot, "dist"), emptyOutDir: true },
});
