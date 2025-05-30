import type { Account, Chain, Transport } from "viem";
import { getCode } from "viem/actions";

import { delegationCode } from "../../constants/index.js";
import { delegateAddress } from "../../relay/rpc/utils/networkCapabilities.js";
import { lowercase } from "../../utils/index.js";
import type { GelatoWalletClient } from "../index.js";

export async function verifyAuthorization<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>) {
  if (client._internal.authorization !== undefined) {
    return client._internal.authorization.authorized;
  }

  const address = client.account.address;
  const bytecode = await getCode(client, { address });

  const isEip7702Authorized = Boolean(
    bytecode?.length &&
      bytecode.length > 0 &&
      lowercase(bytecode) === lowercase(delegationCode(delegateAddress(client)))
  );

  client._internal.authorization = {
    address: delegateAddress(client),
    authorized: isEip7702Authorized
  };

  return isEip7702Authorized;
}
