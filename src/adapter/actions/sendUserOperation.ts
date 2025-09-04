import type { Chain, Client, Hex, Transport, WalletClient } from "viem";
import type {
  PrepareUserOperationParameters,
  SendUserOperationParameters,
  SendUserOperationReturnType,
  SmartAccount
} from "viem/account-abstraction";

import { signAuthorizationList } from "../../actions/internal/signAuthorizationList.js";
import { signSignatureRequest } from "../../actions/internal/signSignatureRequest.js";
import { walletSendPreparedCalls } from "../../relay/rpc/sendPreparedCalls.js";
import { AccountNotFoundError } from "../errors/index.js";
import type { GelatoBundlerConfig } from "../index.js";
import { hasPreparedCalls } from "../utils/index.js";
import { prepareUserOperation } from "./index.js";

export async function sendUserOperation<
  const calls extends readonly unknown[],
  account extends SmartAccount | undefined,
  chain extends Chain | undefined,
  accountOverride extends SmartAccount | undefined = undefined
>(
  client: Client<Transport, chain, account>,
  parameters: SendUserOperationParameters<account, accountOverride, calls>,
  config: GelatoBundlerConfig
): Promise<SendUserOperationReturnType> {
  const { account = client.account } = parameters;

  if (!account) {
    throw new AccountNotFoundError();
  }

  if (account.entryPoint.version === "0.6") {
    throw new Error("entryPoint 0.6 is not supported");
  }

  const preparedCalls = hasPreparedCalls(parameters)
    ? parameters.preparedCalls
    : await prepareUserOperation(client, parameters as PrepareUserOperationParameters, config);

  const { context } = preparedCalls;
  const signature = await signSignatureRequest(
    client as unknown as WalletClient<Transport, Chain, SmartAccount>,
    preparedCalls
  );
  const authorizationList = await signAuthorizationList(
    client as unknown as WalletClient<Transport, Chain, SmartAccount>
  );

  const { id } = await walletSendPreparedCalls(client as Client<Transport, Chain, SmartAccount>, {
    apiKey: config.apiKey,
    authorizationList,
    context,
    signature
  });

  return id as Hex;
}
