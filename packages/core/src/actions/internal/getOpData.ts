import type { Account, Call, Chain, PublicActions, Transport, WalletClient } from "viem";

import { abi as accountAbi } from "../../abis/account.js";
import type { Payment } from "../../payment/index.js";
import { serializeTypedData } from "../../utils/eip712.js";

export async function getOpData<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(
  client: WalletClient<transport, chain, account> & PublicActions<transport, chain, account>,
  calls: Call[],
  payment: Payment,
  isDelegation: boolean
) {
  if (payment.type !== "native") {
    let nonce = 0n;
    if (!isDelegation) {
      nonce = (await client.readContract({
        address: client.account.address,
        abi: accountAbi,
        functionName: "getNonce"
      })) as bigint;
    }

    const typedData = serializeTypedData(client.chain.id, client.account.address, calls, nonce);

    // TODO: add support for passkey signers
    return await client.signTypedData({
      account: client.account,
      ...typedData
    });
  }

  return undefined;
}
