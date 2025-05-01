import { sepolia } from "viem/chains";
import { afterAll, beforeAll, vi } from "vitest";

import { delegation } from "../src/constants/index.js";

import { startAnvil, stopAnvil } from "./src/anvil.js";
import { erc20Address } from "./src/constants.js";
import { deployContracts } from "./src/contracts.js";

beforeAll(async () => {
  await startAnvil();

  // Deploy Delegation & related contracts for testing
  await deployContracts({
    delegation: delegation(sepolia.id),
    erc20: erc20Address()
  });

  console.log("Contracts deployed");
});

afterAll(async () => {
  await stopAnvil();
  vi.restoreAllMocks();
});
