import type {
  Account,
  Call,
  Chain,
  Hex,
  PublicActions,
  SignedAuthorizationList,
  Transport,
  WalletClient
} from "viem";

import { encodeExecuteData } from "viem/experimental/erc7821";
import type { Payment } from "../../payment/index.js";

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
      return await client.sendTransaction({
        account: client.account,
        to: client.account.address,
        from: client.account.address,
        chain: client.chain,
        authorizationList,
        data: encodeExecuteData({
          calls,
          opData
        })
        // TODO: fix type
      } as any);
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
