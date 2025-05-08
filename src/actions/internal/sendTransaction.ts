import {
  type Account,
  type Address,
  type Chain,
  type Hex,
  type SignedAuthorizationList,
  type Transport,
  ethAddress
} from "viem";

import type { Payment } from "../../payment/index.js";
import { type GelatoResponse, smartWalletCall, sponsoredCall } from "../../relay/index.js";
import type { GelatoWalletClient } from "../index.js";

export async function sendTransaction<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(
  client: GelatoWalletClient<transport, chain, account>,
  target: Address,
  data: Hex,
  payment: Payment,
  authorizationList?: SignedAuthorizationList
): Promise<GelatoResponse> {
  switch (payment.type) {
    case "native": {
      return smartWalletCall(
        {
          chainId: client.chain.id,
          target,
          feeToken: ethAddress,
          data,
          sponsorApiKey: client._internal.apiKey(),
          authorizationList
        },
        client
      );
    }
    case "sponsored": {
      const sponsorApiKey = payment.sponsorApiKey ?? client._internal.apiKey();

      if (!sponsorApiKey) {
        throw new Error("Sponsor API key is required");
      }

      return sponsoredCall(
        {
          chainId: client.chain.id,
          target,
          data,
          sponsorApiKey,
          authorizationList
        },
        client
      );
    }
    case "erc20": {
      return smartWalletCall(
        {
          chainId: client.chain.id,
          target,
          feeToken: payment.token,
          data,
          sponsorApiKey: client._internal.apiKey(),
          authorizationList
        },
        client
      );
    }
    default: {
      throw new Error("Unsupported payment type");
    }
  }
}
