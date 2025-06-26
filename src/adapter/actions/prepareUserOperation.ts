import type { Call, Chain, Client, Hex, Transport } from "viem";
import {
  type PrepareUserOperationParameters,
  type PrepareUserOperationRequest,
  type PrepareUserOperationReturnType,
  type SmartAccount,
  formatUserOperation
} from "viem/account-abstraction";
import { api } from "../../constants/index.js";
import {
  type Capabilities,
  type ERC4337Context,
  GatewaySignature,
  type Quote,
  type WalletPrepareCallsResponse
} from "../../relay/rpc/index.js";
import { serializeCalls } from "../../relay/rpc/utils/serialize.js";
import { WalletType } from "../../wallet/index.js";
import { AccountNotFoundError } from "../errors/index.js";
import type { GelatoBundlerConfig } from "../index.js";

interface GelatoUserOpExtension {
  gelato: {
    quote: Quote;
    timestamp?: number;
    signature?: Hex;
  };
}

export const prepareUserOperation = async <
  account extends SmartAccount | undefined,
  const calls extends readonly unknown[],
  const request extends PrepareUserOperationRequest<account, accountOverride, calls>,
  accountOverride extends SmartAccount | undefined = undefined
>(
  client: Client<Transport, Chain, account>,
  parameters: PrepareUserOperationParameters<account, accountOverride, calls, request>,
  config: GelatoBundlerConfig
): Promise<
  PrepareUserOperationReturnType<account, accountOverride, calls, request> & GelatoUserOpExtension
> => {
  const { account = client.account } = parameters;
  if (!account) throw new AccountNotFoundError();

  if (account.entryPoint.version === "0.6") {
    throw new Error("entryPoint 0.6 is not supported");
  }

  const calls = await (async () => {
    if (parameters.calls) {
      return serializeCalls(parameters.calls as Call[]);
    }

    if (!parameters.callData) {
      throw new Error("No calls/callData specified");
    }

    if (!account.decodeCalls) {
      throw new Error(
        "callData may only be specified if account.decodeCalls is defined, consider passing calls instead"
      );
    }

    const decodedCalls = await account.decodeCalls(parameters.callData);
    return serializeCalls(decodedCalls as Call[]);
  })();

  const factory = await account.getFactoryArgs();

  const capabilities: Capabilities = {
    wallet: {
      type: WalletType.Custom,
      encoding: config.encoding
    },
    payment: config.payment,
    entryPoint: {
      version: account.entryPoint.version,
      address: account.entryPoint.address
    },
    factory:
      factory.factory && factory.factoryData
        ? {
            address: factory.factory,
            data: factory.factoryData
          }
        : undefined
  };

  const url = config.apiKey
    ? `${api()}/smartwallet?apiKey=${config.apiKey}`
    : `${api()}/smartwallet`;

  const raw = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "wallet_prepareCalls",
      params: [
        {
          chainId: client.chain.id,
          from: account.address,
          calls,
          capabilities
        }
      ]
    })
  });

  const data = await raw.json();
  if (data.error || data.message)
    throw new Error(data.error?.message || data.message || "wallet_prepareCalls failed");

  const response = data.result as WalletPrepareCallsResponse;
  const { userOp, quote, timestamp, signature } = response.context as ERC4337Context;

  return {
    ...formatUserOperation(userOp),
    gelato: {
      quote,
      timestamp,
      signature
    }
  } as unknown as PrepareUserOperationReturnType<account, accountOverride, calls, request> &
    GelatoUserOpExtension;
};
