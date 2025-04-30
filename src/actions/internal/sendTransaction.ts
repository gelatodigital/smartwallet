import {
  type Account,
  type Call,
  type Chain,
  type Hex,
  type SignedAuthorizationList,
  type Transport,
  ethAddress
} from "viem";
import { encodeExecuteData } from "viem/experimental/erc7821";

import type { Payment } from "../../payment/index.js";
import { smartWalletCall, sponsoredCall } from "../../relay/index.js";
import type { GelatoWalletClient } from "../index.js";

export async function sendTransaction<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(
  client: GelatoWalletClient<transport, chain, account>,
  calls: Call[],
  payment: Payment,
  authorizationList?: SignedAuthorizationList,
  opData?: Hex | undefined
) {
  switch (payment.type) {
    case "native": {
      return await smartWalletCall({
        chainId: client.chain.id,
        target: client.account.address,
        data: encodeExecuteData({
          calls,
          opData
        }),
        feeToken: ethAddress,
        authorizationList
      });
    }
    case "sponsored": {
      const sponsorApiKey = payment.sponsorApiKey ?? client._internal.sponsorApiKey();

      if (!sponsorApiKey) {
        throw new Error("Sponsor API key is required");
      }

      return await sponsoredCall({
        chainId: client.chain.id,
        target: client.account.address,
        data: encodeExecuteData({
          calls,
          opData
        }),
        sponsorApiKey,
        authorizationList
      });
    }
    case "erc20": {
      return await smartWalletCall({
        chainId: client.chain.id,
        target: client.account.address,
        feeToken: payment.token,
        data: encodeExecuteData({
          calls,
          opData
        }),
        authorizationList
      });
    }
    default: {
      throw new Error("Unsupported payment type");
    }
  }
}
