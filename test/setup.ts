import { afterAll, beforeAll, vi } from "vitest";

vi.mock("../src/constants/index.js", async () => {
  const actual = await vi.importActual("../src/constants/index.js");

  return {
    ...actual,
    api: (t = "http") =>
      t === "http" ? "https://api.staging.gelato.digital" : "wss://api.staging.gelato.digital"
  };
});

beforeAll(async () => {
  vi.resetModules();
});

afterAll(async () => {
  vi.restoreAllMocks();
});
