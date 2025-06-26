import type { Chain, Client, Hex, Transport } from "viem";
import {
  type PrepareUserOperationParameters,
  type SendUserOperationParameters,
  type SendUserOperationReturnType,
  type SmartAccount,
  type UserOperation,
  formatUserOperationRequest
} from "viem/account-abstraction";
import { api } from "../../constants/index.js";
import type { WalletSendPreparedCallsResponse } from "../../relay/rpc/index.js";
import type { Context } from "../../relay/rpc/index.js";
import { WalletType } from "../../wallet/index.js";
import { AccountNotFoundError } from "../errors/index.js";
import type { GelatoBundlerConfig } from "../index.js";
import { prepareUserOperation } from "./index.js";

export async function sendUserOperation<
  const calls extends readonly unknown[],
  account extends SmartAccount | undefined,
  accountOverride extends SmartAccount | undefined = undefined
>(
  client: Client<Transport, Chain, account>,
  parameters: SendUserOperationParameters<account, accountOverride, calls>,
  config: GelatoBundlerConfig
): Promise<SendUserOperationReturnType> {
  const { account = client.account } = parameters;
  if (!account) throw new AccountNotFoundError();

  if (account.entryPoint.version === "0.6") {
    throw new Error("entryPoint 0.6 is not supported");
  }

  const userOp = await prepareUserOperation(
    client,
    parameters as unknown as PrepareUserOperationParameters,
    config
  );
  const signature = await account.signUserOperation({ ...(userOp as UserOperation) });

  const context: Context = {
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
      userOp.factory && userOp.factoryData
        ? {
            address: userOp.factory,
            data: userOp.factoryData
          }
        : undefined,
    userOp: formatUserOperationRequest(userOp as UserOperation),
    quote: userOp.gelato.quote,
    timestamp: userOp.gelato?.timestamp,
    signature: userOp.gelato?.signature
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
      method: "wallet_sendPreparedCalls",
      params: [
        {
          chainId: client.chain.id,
          context,
          signature
        }
      ]
    })
  });

  const data = await raw.json();
  if (data.error || data.message) {
    throw new Error(data.error?.message || data.message || "wallet_sendPreparedCalls failed");
  }

  const { id } = data.result as WalletSendPreparedCallsResponse;
  return id as Hex;
}
