import { sepolia } from "viem/chains";
import { afterAll, beforeAll, vi } from "vitest";

import { delegation } from "../src/constants/index.js";

import { startAnvil, stopAnvil } from "./src/anvil.js";
import { erc20Address } from "./src/constants.js";
import { deployContracts } from "./src/contracts.js";

import type { Hash } from "viem";
import * as relay from "../src/relay/index.js";
import { sponsorAccount } from "./src/account.js";
import { wallet } from "./src/index.js";

beforeAll(async () => {
  await startAnvil();

  // Deploy Delegation & related contracts for testing
  await deployContracts({
    delegation: delegation(sepolia.id),
    erc20: erc20Address()
  });

  console.log("Contracts deployed");

  const sponsorClient = wallet.walletClient(sponsorAccount);

  // Mock Relay calls locally
  const mockSmartWalletCall = async (
    parameters: relay.SmartWalletCallRequest
  ): Promise<relay.GelatoResponse> => {
    const hash = await sponsorClient.sendTransaction({
      authorizationList: parameters.authorizationList,
      data: parameters.data as Hash,
      to: parameters.target as Hash
    });

    return {
      id: "mock-task-id",
      wait: async () => hash,
      on: () => () => {}
    };
  };
  const mockSponsoredCall = async (
    parameters: relay.SponsoredCallRequest
  ): Promise<relay.GelatoResponse> => {
    const hash = await sponsorClient.sendTransaction({
      authorizationList: parameters.authorizationList,
      data: parameters.data as Hash,
      to: parameters.target as Hash
    });

    return {
      id: "mock-task-id",
      wait: async () => hash,
      on: () => () => {}
    };
  };

  vi.spyOn(relay, "smartWalletCall").mockImplementation(mockSmartWalletCall);
  vi.spyOn(relay, "sponsoredCall").mockImplementation(mockSponsoredCall);
});

afterAll(async () => {
  await stopAnvil();
  vi.restoreAllMocks();
});
