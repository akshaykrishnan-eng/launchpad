import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// @testing-library/react normally auto-registers this via a global
// afterEach, but that detection needs Vitest's `globals: true`, which
// this project doesn't enable (tests import afterEach explicitly
// instead). Without this, the DOM from one test leaks into the next.
afterEach(() => {
  cleanup();
});
