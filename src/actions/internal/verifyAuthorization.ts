import type { Account, Chain, Transport } from "viem";
import { getCode } from "viem/actions";

import { delegation } from "../../constants/index.js";
import { lowercase } from "../../utils/index.js";
import type { GelatoWalletClient } from "../index.js";

export async function verifyAuthorization<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>) {
  const address = client.account.address;
  const bytecode = await getCode(client, { address });

  if (client._internal.authorized !== undefined) {
    return client._internal.authorized;
  }

  const isEip7702Authorized = Boolean(
    bytecode?.length &&
      bytecode.length > 0 &&
      lowercase(bytecode) === lowercase(`0xef0100${delegation(client.chain.id).slice(2)}`)
  );

  client._internal.authorized = isEip7702Authorized;

  return isEip7702Authorized;
}
