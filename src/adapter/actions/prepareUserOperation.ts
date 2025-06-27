import type { Call, Chain, Client, Hex, Transport } from "viem";
import {
  type PrepareUserOperationParameters,
  type PrepareUserOperationRequest,
  type PrepareUserOperationReturnType,
  type SmartAccount,
  type UserOperation,
  formatUserOperation
} from "viem/account-abstraction";
import { api } from "../../constants/index.js";
import type {
  Capabilities,
  ERC4337Context,
  Quote,
  WalletPrepareCallsResponse
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

const defaultParameters = [
  "factory",
  "fees",
  "gas",
  "paymaster",
  "nonce",
  "signature",
  "authorization"
];

export async function prepareUserOperation<
  account extends SmartAccount | undefined,
  const calls extends readonly unknown[],
  const request extends PrepareUserOperationRequest<account, accountOverride, calls>,
  accountOverride extends SmartAccount | undefined = undefined
>(
  client: Client<Transport, Chain, account>,
  parameters_: PrepareUserOperationParameters<account, accountOverride, calls, request>,
  config: GelatoBundlerConfig
): Promise<
  PrepareUserOperationReturnType<account, accountOverride, calls, request> & GelatoUserOpExtension
> {
  const parameters = parameters_ as PrepareUserOperationParameters & Partial<GelatoUserOpExtension>;
  const { account = client.account, parameters: properties = defaultParameters } = parameters;

  if (!account) throw new AccountNotFoundError();
  if (account.entryPoint.version === "0.6") {
    throw new Error("entryPoint 0.6 is not supported");
  }

  const shouldPrepareCalls =
    typeof parameters.gelato === "undefined" ||
    (properties.includes("gas") &&
      (typeof parameters.preVerificationGas === "undefined" ||
        typeof parameters.verificationGasLimit === "undefined" ||
        typeof parameters.callGasLimit === "undefined")) ||
    typeof parameters.callData === "undefined";

  const shouldGetFactory =
    shouldPrepareCalls ||
    (properties.includes("factory") &&
      (typeof parameters.factory === "undefined" || typeof parameters.factoryData === "undefined"));

  const factory = shouldGetFactory ? await account.getFactoryArgs() : undefined;

  if (!shouldPrepareCalls) {
    // We already have everything we need, no need to call wallet_prepareCalls
    const userOp: Partial<UserOperation> = {
      callData: parameters.callData,
      sender: parameters.sender ?? account.address
    };

    if (properties.includes("factory")) {
      userOp.factory = parameters.factory ?? factory?.factory;
      userOp.factoryData = parameters.factoryData ?? factory?.factoryData;
    }

    if (properties.includes("fees")) {
      userOp.maxFeePerGas = 0n;
      userOp.maxPriorityFeePerGas = 0n;
    }

    if (properties.includes("gas")) {
      userOp.preVerificationGas = parameters.preVerificationGas;
      userOp.verificationGasLimit = parameters.verificationGasLimit;
      userOp.callGasLimit = parameters.callGasLimit;
    }

    if (properties.includes("nonce")) {
      userOp.nonce = parameters.nonce ?? (await account.getNonce());
    }

    if (properties.includes("signature")) {
      userOp.signature = parameters.signature ?? (await account.getStubSignature());
    }

    return {
      ...userOp,
      gelato: parameters.gelato
    } as unknown as PrepareUserOperationReturnType<account, accountOverride, calls, request> &
      GelatoUserOpExtension;
  }

  const calls = (() => {
    if (!parameters.calls) {
      throw new Error(
        "No calls specified, if you are passing callData directly, consider passing calls instead"
      );
    }
    return serializeCalls(parameters.calls as Call[]);
  })();

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
      factory?.factory && factory?.factoryData
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
}
