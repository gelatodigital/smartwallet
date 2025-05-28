import type { Call, Chain, Transport } from "viem";
import type { SignAuthorizationReturnType } from "viem/accounts";
import type { SmartAccount } from "viem/account-abstraction";

import type { Payment } from "../payment/index.js";
import type { GelatoResponse } from "../relay/index.js";
import { walletPrepareCalls, walletSendPreparedCalls } from "../relay/rpc/index.js";
import type { Context, SignatureRequest } from "../relay/rpc/interfaces/index.js";
import { initializeNetworkCapabilities } from "../relay/rpc/utils/networkCapabilities.js";
import { isEIP7702 } from "../wallet/index.js";
import type { GelatoWalletClient } from "./index.js";
import { signAuthorizationList } from "./internal/signAuthorizationList.js";
import { signSignatureRequest } from "./internal/signSignatureRequest.js";
import { verifyAuthorization } from "./internal/verifyAuthorization.js";

/**
 *
 * @param client - Client.
 * @param parameters - Execution parameters.
 * @returns Transaction hash.
 */
export async function execute<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends SmartAccount = SmartAccount
>(
  client: GelatoWalletClient<transport, chain, account>,
  parameters: { payment: Payment; calls: Call[]; nonceKey?: bigint }
): Promise<GelatoResponse> {
  const { payment, calls, nonceKey } = structuredClone(parameters);

  await initializeNetworkCapabilities(client);

  let authorizationList: SignAuthorizationReturnType[] | undefined;

  let context: Context;
  let signatureRequest: SignatureRequest;

  if (isEIP7702(client)) {
    const [authResult, walletPrepareCallsResult] = await Promise.all([
      (async () => {
        const authorized = await verifyAuthorization(client);
        const authorizationList = authorized ? undefined : await signAuthorizationList(client);
        return { authorizationList };
      })(),

      walletPrepareCalls(client, {
        calls,
        payment,
        nonceKey
      })
    ]);

    authorizationList = authResult.authorizationList;
    ({ context, signatureRequest } = walletPrepareCallsResult);
  } else {
    ({ context, signatureRequest } = await walletPrepareCalls(client, {
      calls,
      payment,
      nonceKey
    }));
  }

  const signature = await signSignatureRequest(client, signatureRequest);

  return await walletSendPreparedCalls(client, {
    context,
    signature,
    authorizationList
  });
}
