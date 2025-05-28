import type { Account, Chain, Transport } from "viem";
import type { GelatoWalletClient } from "../../../actions";
import { walletGetCapabilities } from "../getCapabilities";

export async function initializeNetworkCapabilities<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>) {
  if (
    !client._internal.networkCapabilities ||
    !client._internal.networkCapabilities[client.chain.id]
  ) {
    const networkCapabilities = await walletGetCapabilities(client);
    client._internal.networkCapabilities = networkCapabilities;
  }

  return client._internal.networkCapabilities[client.chain.id];
}

export function feeCollector<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>) {
  if (
    !client._internal.networkCapabilities ||
    !client._internal.networkCapabilities[client.chain.id]
  ) {
    throw new Error("Network capabilities not initialized");
  }

  return client._internal.networkCapabilities[client.chain.id].feeCollector;
}

export function delegateAddress<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>) {
  if (
    !client._internal.networkCapabilities ||
    !client._internal.networkCapabilities[client.chain.id]
  ) {
    throw new Error("Network capabilities not initialized");
  }

  const walletType = client._internal.wallet.type;

  const delegateAddresses =
    client._internal.networkCapabilities[client.chain.id].contracts.delegation[walletType];

  if (!delegateAddresses || delegateAddresses.length === 0) {
    throw new Error(`Wallet type ${walletType} not supported on ${client.chain.name}`);
  }

  const latestDelegateVersion = delegateAddresses.sort((a, b) =>
    b.version.localeCompare(a.version)
  )[0];

  return latestDelegateVersion.address;
}
