import type { Chain, Client, Transport } from "viem";
import type { BundlerActions, SmartAccount } from "viem/account-abstraction";
import { type Payment, isSponsored } from "../payment/index.js";
import type { WalletEncoding } from "../wallet/index.js";
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
  encoding: WalletEncoding;
  apiKey?: string;
}

export function gelatoBundlerActions(config: GelatoBundlerConfig) {
  return <
    transport extends Transport = Transport,
    chain extends Chain = Chain,
    account extends SmartAccount | undefined = SmartAccount | undefined
  >(
    client: Client<transport, chain, account>
  ): BundlerActions<account> => {
    config.apiKey = (isSponsored(config.payment) && config.payment.sponsorApiKey) || config.apiKey;

    if (isSponsored(config.payment) && !config.apiKey) {
      throw new Error("apiKey must be provided for sponsored payment");
    }

    return {
      estimateUserOperationGas: (parameters) => estimateUserOperationGas(client, parameters),
      getChainId: () => getChainId(client),
      getSupportedEntryPoints: () => getSupportedEntryPoints(),
      getUserOperation: (parameters) => getUserOperation(client, parameters),
      getUserOperationReceipt: (parameters) => getUserOperationReceipt(client, parameters),
      prepareUserOperation: (parameters) => prepareUserOperation(client, parameters, config),
      sendUserOperation: (parameters) => sendUserOperation(client, parameters, config),
      waitForUserOperationReceipt: (parameters) => waitForUserOperationReceipt(client, parameters)
    };
  };
}
