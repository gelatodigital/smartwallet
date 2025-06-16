import { afterAll, beforeAll, vi } from "vitest";

vi.mock("../src/constants/index.js", async () => {
  const actual = await vi.importActual("../src/constants/index.js");

  return {
    ...actual,
    api: (t = "http") => (t === "http" ? "https://api.gelato.digital" : "wss://api.gelato.digital")
  };
});

beforeAll(async () => {
  vi.resetModules();
});

afterAll(async () => {
  vi.restoreAllMocks();
});
