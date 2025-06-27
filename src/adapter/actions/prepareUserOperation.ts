import type { Call, Chain, Client, Transport } from "viem";
import type {
  PrepareUserOperationParameters,
  PrepareUserOperationRequest,
  SmartAccount
} from "viem/account-abstraction";

import {
  type ERC4337Context,
  type WalletPrepareCallsResponse,
  walletPrepareCalls
} from "../../relay/rpc/index.js";
import { WalletType } from "../../wallet/index.js";
import { AccountNotFoundError } from "../errors/index.js";
import type { GelatoBundlerConfig } from "../index.js";

export const prepareUserOperation = async <
  const calls extends readonly unknown[],
  const request extends PrepareUserOperationRequest<account, accountOverride, calls>,
  account extends SmartAccount | undefined,
  chain extends Chain | undefined,
  accountOverride extends SmartAccount | undefined = undefined
>(
  client: Client<Transport, chain, account>,
  parameters: PrepareUserOperationParameters<account, accountOverride, calls, request>,
  config: GelatoBundlerConfig
): Promise<WalletPrepareCallsResponse<ERC4337Context>> => {
  const { account = client.account } = parameters;

  if (!account) throw new AccountNotFoundError();

  if (account.entryPoint.version === "0.6") {
    throw new Error("entryPoint 0.6 is not supported");
  }

  const calls = await (async () => {
    if ("calls" in parameters) {
      return parameters.calls as Call[];
    }

    if (!parameters.callData) {
      throw new Error("No calls/callData specified");
    }

    if (!account.decodeCalls) {
      throw new Error(
        "callData may only be specified if account.decodeCalls is defined, consider passing calls instead"
      );
    }

    return (await account.decodeCalls(parameters.callData)) as Call[];
  })();

  const response = await walletPrepareCalls(client as Client<Transport, Chain, SmartAccount>, {
    calls,
    payment: config.payment,
    apiKey: config.apiKey,
    scw: {
      type: WalletType.Custom,
      encoding: config.encoding
    },
    erc4337: true
  });

  return response as WalletPrepareCallsResponse<ERC4337Context>;
};
