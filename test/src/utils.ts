import type { Account, Chain, Hash, Transport, WalletClient } from "viem";

import { vi } from "vitest";
import { blockTime } from "./constants.js";

import * as relay from "../../src/relay/index.js";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export const waitBlockTime = (numberBlocks = 1) => wait(blockTime * numberBlocks * 1000);

export const mockRelay = (
  walletClient: WalletClient<Transport, Chain, Account>,
  sponsorClient: WalletClient<Transport, Chain, Account>
) => {
  // Mock Relay calls locally
  const mockSmartWalletCall = async (
    parameters: relay.SmartWalletCallRequest
  ): Promise<relay.GelatoResponse> => {
    const hash = await walletClient.sendTransaction({
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
};
