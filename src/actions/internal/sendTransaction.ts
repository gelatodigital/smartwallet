import type { Account, Address, Chain, Hex, SignedAuthorizationList, Transport } from "viem";

import type { SendTransactionParameters } from "viem/zksync";
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
      const hash = await client.sendTransaction({
        to: target,
        data,
        authorizationList
      } as SendTransactionParameters);

      return {
        id: hash,
        wait: async () => hash,
        // TODO: call callback to immediately resolve
        on: () => () => {}
      };
    }
    case "sponsored": {
      const sponsorApiKey = payment.sponsorApiKey ?? client._internal.apiKey();

      if (!sponsorApiKey) {
        throw new Error("Sponsor API key is required");
      }

      return sponsoredCall({
        chainId: client.chain.id,
        target,
        data,
        sponsorApiKey,
        authorizationList
      });
    }
    case "erc20": {
      return smartWalletCall({
        chainId: client.chain.id,
        target,
        feeToken: payment.token,
        data,
        authorizationList
      });
    }
    default: {
      throw new Error("Unsupported payment type");
    }
  }
}
