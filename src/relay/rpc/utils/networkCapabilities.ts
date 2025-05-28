import type { Chain, Transport } from "viem";
import type { SmartAccount } from "viem/account-abstraction";

import type { GelatoWalletClient } from "../../../actions";
import { walletGetCapabilities } from "../getCapabilities";

export async function initializeNetworkCapabilities<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends SmartAccount = SmartAccount
>(client: GelatoWalletClient<transport, chain, account>) {
  if (!client._internal.networkCapabilities?.[client.chain.id]) {
    const networkCapabilities = await walletGetCapabilities(client);
    client._internal.networkCapabilities = networkCapabilities;
  }

  return client._internal.networkCapabilities[client.chain.id];
}

export function feeCollector<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends SmartAccount = SmartAccount
>(client: GelatoWalletClient<transport, chain, account>) {
  if (
    !client._internal.networkCapabilities ||
    !client._internal.networkCapabilities?.[client.chain.id]
  ) {
    throw new Error("Internal error: feeCollector: Network capabilities not initialized");
  }

  return client._internal.networkCapabilities[client.chain.id].feeCollector;
}

export function delegateAddress<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends SmartAccount = SmartAccount
>(client: GelatoWalletClient<transport, chain, account>) {
  if (
    !client._internal.networkCapabilities ||
    !client._internal.networkCapabilities?.[client.chain.id]
  ) {
    throw new Error("Internal error: delegateAddress: Network capabilities not initialized");
  }

  const walletType = client._internal.wallet.type;

  let walletVersions =
    client._internal.networkCapabilities[client.chain.id].contracts.delegation[walletType];

  if (!walletVersions || walletVersions.length === 0) {
    throw new Error(`Wallet type ${walletType} not supported on ${client.chain.name}`);
  }

  walletVersions = walletVersions.sort((a, b) => b.version.localeCompare(a.version));

  const versionToUse =
    walletVersions.find(({ version }) => version === client._internal.wallet.version) ||
    walletVersions[0];

  return versionToUse.address;
}
