import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "node24",
    lib: { entry: "cli.ts", formats: ["es"], fileName: "cli" },
    rollupOptions: { external: [/^node:/, /^[^./]/] },
  },
});
