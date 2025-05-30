import type { Call, Chain, Transport } from "viem";
import type { SmartAccount } from "viem/account-abstraction";

import type { Payment } from "../payment/index.js";
import type { GelatoResponse } from "../relay/index.js";
import { walletPrepareCalls, walletSendPreparedCalls } from "../relay/rpc/index.js";
import { initializeNetworkCapabilities } from "../relay/rpc/utils/networkCapabilities.js";
import type { GelatoWalletClient } from "./index.js";
import { signSignatureRequest } from "./internal/signSignatureRequest.js";
import type { GelatoSmartAccount } from "../accounts/index.js";

/**
 *
 * @param client - Client.
 * @param parameters - Execution parameters.
 * @returns Transaction hash.
 */
export async function execute<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends GelatoSmartAccount = GelatoSmartAccount
>(
  client: GelatoWalletClient<transport, chain, account>,
  parameters: { payment: Payment; calls: Call[]; nonceKey?: bigint }
): Promise<GelatoResponse> {
  const { payment, calls, nonceKey } = structuredClone(parameters);

  await initializeNetworkCapabilities(client);

  const { context, signatureRequest } = await walletPrepareCalls(client, {
    calls,
    payment,
    nonceKey
  });

  const signature = await signSignatureRequest(client, signatureRequest);

  const authorizationList = client.account.authorization
    ? // smart account must implement "signAuthorization"
      [
        await client.signAuthorization({
          account: client.account.authorization.account,
          contractAddress: client.account.authorization.address
        })
      ]
    : undefined;

  return await walletSendPreparedCalls(client, {
    context,
    signature,
    authorizationList
  });
}
