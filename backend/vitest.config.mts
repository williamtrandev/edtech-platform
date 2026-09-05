import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Populates the required env vars before any module reads them.
    setupFiles: ["./vitest.setup.ts"],
    // Tests live next to the code they cover.
    include: ["src/**/*.test.ts"],
    // Scripts are one-shot seeders that talk to a real database.
    exclude: ["node_modules/**", "dist/**", "scripts/**"]
  }
});
