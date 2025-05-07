import {
  http,
  type Account,
  type Chain,
  type Transport,
  type WalletClient,
  createWalletClient
} from "viem";
import { sepolia } from "viem/chains";

import { rpcUrl } from "./anvil.js";

const walletClients: Map<string, WalletClient<Transport, Chain, Account>> = new Map();

export const walletClient = (account: Account): WalletClient<Transport, Chain, Account> => {
  if (walletClients.has(account.address)) {
    return walletClients.get(account.address) as WalletClient<Transport, Chain, Account>;
  }

  const client = createWalletClient({
    account,
    chain: sepolia,
    transport: http(rpcUrl())
  });

  walletClients.set(account.address, client);

  return client;
};
