import type { Account, Chain, Transport } from "viem";

import type { GelatoWalletClient } from "../../actions/index.js";
import { api } from "../../constants/index.js";
import { WalletType } from "../../wallet/index.js";
import type {
  Capabilities,
  KernelCapabilities,
  SmartWalletCapabilities,
  WalletPrepareCallsParams,
  WalletPrepareCallsResponse
} from "./interfaces/index.js";
import { serializeCalls, serializeNonceKey } from "./utils/serialize.js";

export const walletPrepareCalls = async <
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(
  client: GelatoWalletClient<transport, chain, account>,
  params: WalletPrepareCallsParams
): Promise<WalletPrepareCallsResponse> => {
  const { payment } = params;

  const calls = serializeCalls(params.calls);

  let capabilities: Capabilities;

  if (client._internal.wallet.type === WalletType.Gelato) {
    capabilities = <SmartWalletCapabilities>{
      wallet: client._internal.wallet,
      payment,
      authorization: client._internal.authorization,
      nonceKey: serializeNonceKey(params.nonceKey)
    };
  } else {
    capabilities = <KernelCapabilities>{
      wallet: client._internal.wallet,
      payment,
      authorization: client._internal.authorization,
      factory: client._internal.factory,
      entryPoint: client._internal.entryPoint
    };
  }

  const raw = await fetch(`${api()}/smartwallet`, {
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
          from: client.account.address,
          calls,
          capabilities
        }
      ]
    })
  });

  const data = await raw.json();

  if (data.error || data.message)
    throw new Error(data.error?.message || data.message || "walletPrepareCalls failed");

  return data.result as WalletPrepareCallsResponse;
};
