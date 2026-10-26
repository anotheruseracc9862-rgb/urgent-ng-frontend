import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: { environment: "node", exclude: ["**/node_modules/**", "**/.next/**"], testTimeout: 20000 },
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
});
