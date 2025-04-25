import {
  type Account,
  type Call,
  type Chain,
  type Hex,
  type PublicActions,
  type SignedAuthorizationList,
  type Transport,
  type WalletClient,
  ethAddress
} from "viem";

import { encodeExecuteData } from "viem/experimental/erc7821";
import type { Payment } from "../../payment/index.js";
import { callGelatoAccount, sponsoredCall } from "../../relay/index.js";

export async function sendTransaction<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(
  client: WalletClient<transport, chain, account> & PublicActions<transport, chain, account>,
  calls: Call[],
  payment: Payment,
  authorizationList?: SignedAuthorizationList,
  opData?: Hex | undefined
) {
  switch (payment.type) {
    case "native": {
      return await callGelatoAccount({
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
      return await sponsoredCall({
        chainId: client.chain.id,
        target: client.account.address,
        data: encodeExecuteData({
          calls,
          opData
        }),
        sponsorApiKey: payment.apiKey,
        authorizationList
      });
    }
    case "erc20": {
      return await callGelatoAccount({
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
