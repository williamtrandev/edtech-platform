import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./@")
    }
  },
  test: {
    // Pure logic only for now; component tests would need a DOM environment.
    environment: "node",
    include: ["src/**/*.test.ts"]
  }
});
