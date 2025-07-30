import type { Chain, Client, Transport } from "viem";
import {
  type BundlerActions,
  type SmartAccount,
  formatUserOperation
} from "viem/account-abstraction";
import { type Payment, isSponsored } from "../payment/index.js";
import type { ERC4337Encoding } from "../wallet/index.js";
import {
  type GetUserOperationGasPriceReturnType,
  getUserOperationGasPrice as getUserOperationGasPriceAction
} from "./actions/getUserOperationGasPrice.js";
import {
  estimateUserOperationGas,
  getChainId,
  getSupportedEntryPoints,
  getUserOperation,
  getUserOperationReceipt,
  prepareUserOperation,
  sendUserOperation,
  waitForUserOperationReceipt
} from "./actions/index.js";

export interface GelatoBundlerConfig {
  payment: Payment;
  encoding: ERC4337Encoding;
  apiKey?: string;
}

type GelatoUserOperationGasPriceAction = {
  getUserOperationGasPrice: () => Promise<GetUserOperationGasPriceReturnType>;
};

export function gelatoBundlerActions(config: GelatoBundlerConfig) {
  return <
    transport extends Transport = Transport,
    chain extends Chain | undefined = undefined,
    account extends SmartAccount | undefined = SmartAccount | undefined
  >(
    client: Client<transport, chain, account>
  ): BundlerActions<account> & GelatoUserOperationGasPriceAction => {
    if (isSponsored(config.payment) && !config.apiKey) {
      throw new Error("apiKey must be provided for sponsored payment");
    }

    return {
      estimateUserOperationGas: (parameters) =>
        estimateUserOperationGas(client, parameters, config),
      getChainId: () => getChainId(client),
      getSupportedEntryPoints: () => getSupportedEntryPoints(),
      getUserOperation: (parameters) => getUserOperation(client, parameters),
      getUserOperationReceipt: (parameters) => getUserOperationReceipt(client, parameters),
      prepareUserOperation: async (parameters) => {
        const response = await prepareUserOperation(client, parameters, config);

        return {
          ...formatUserOperation(response.context.userOp),
          preparedCalls: response
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        } as any;
      },
      sendUserOperation: (parameters) => sendUserOperation(client, parameters, config),
      waitForUserOperationReceipt: (parameters) => waitForUserOperationReceipt(client, parameters),
      getUserOperationGasPrice: () => getUserOperationGasPriceAction(client, config.apiKey)
    };
  };
}

export function gelatoUserOperationGasPriceAction() {
  return <
    transport extends Transport = Transport,
    chain extends Chain | undefined = undefined,
    account extends SmartAccount | undefined = SmartAccount | undefined
  >(
    client: Client<transport, chain, account>
  ): GelatoUserOperationGasPriceAction => {
    return {
      getUserOperationGasPrice: () => getUserOperationGasPriceAction(client)
    };
  };
}

export function getUserOperationGasPrice(chainId: number, apiKey?: string) {
  return getUserOperationGasPriceAction(chainId, apiKey);
}
