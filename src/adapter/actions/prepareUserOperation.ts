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
  account extends SmartAccount | undefined,
  chain extends Chain | undefined,
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

  if (!account) {
    throw new AccountNotFoundError();
  }

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

    return parameters.calls as Call[];
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
