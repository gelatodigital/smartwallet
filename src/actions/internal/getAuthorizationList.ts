import type { Account, Chain, Transport } from "viem";
import { getCode } from "viem/actions";

import { delegation } from "../../constants/index.js";
import type { Payment } from "../../payment/index.js";
import { lowercase } from "../../utils/index.js";
import type { GelatoWalletClient } from "../index.js";

export async function getAuthorizationList<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>, payment: Payment) {
  const address = client.account.address;
  const bytecode = await getCode(client, { address });

  const isEip7702Authorized = Boolean(
    bytecode?.length &&
      bytecode.length > 0 &&
      lowercase(bytecode) === lowercase(`0xef0100${delegation(client.chain.id).slice(2)}`)
  );

  return isEip7702Authorized
    ? []
    : [
        await client.signAuthorization({
          account: client.account,
          contractAddress: delegation(client.chain.id),
          executor: payment.type === "native" ? "self" : undefined
        })
      ];
}
