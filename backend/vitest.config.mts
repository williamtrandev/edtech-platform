import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Tests live next to the code they cover.
    include: ["src/**/*.test.ts"],
    // Scripts are one-shot seeders that talk to a real database.
    exclude: ["node_modules/**", "dist/**", "scripts/**"]
  }
});
