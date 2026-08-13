// vitest.config.ts
// Separate from vite.config.ts, whose `root` is ./src for the options build.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The media helpers use DOMParser and document.createElement.
    environment: "jsdom",
    include: ["src/test/**/*.test.ts"],
  },
});
