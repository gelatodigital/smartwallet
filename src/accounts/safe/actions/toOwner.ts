// Taken from permissionless/accounts/safe: https://github.com/pimlicolabs/permissionless.js/blob/main/packages/permissionless/accounts/safe/toSafeSmartAccount.ts

import {
  type Account,
  type Address,
  type Chain,
  createWalletClient,
  custom,
  type EIP1193Provider,
  type LocalAccount,
  type OneOf,
  type Transport,
  type WalletClient
} from "viem";
import { toAccount } from "viem/accounts";

import { signTypedData } from "viem/actions";
import { getAction } from "viem/utils";

export type EthereumProvider = OneOf<
  // biome-ignore lint/suspicious/noExplicitAny: any type override
  { request(...args: any): Promise<any> } | EIP1193Provider
>;

export async function toOwner<provider extends EthereumProvider>({
  owner,
  address
}: {
  owner: OneOf<provider | WalletClient<Transport, Chain | undefined, Account> | LocalAccount>;
  address?: Address;
}): Promise<LocalAccount> {
  if ("type" in owner && owner.type === "local") {
    return owner as LocalAccount;
  }

  let walletClient: WalletClient<Transport, Chain | undefined, Account> | undefined;

  if ("request" in owner) {
    if (!address) {
      try {
        [address] = await (owner as EthereumProvider).request({
          method: "eth_requestAccounts"
        });
      } catch {
        [address] = await (owner as EthereumProvider).request({
          method: "eth_accounts"
        });
      }
    }
    if (!address) {
      // For TS to be happy
      throw new Error("address is required");
    }
    walletClient = createWalletClient({
      account: address,
      transport: custom(owner as EthereumProvider)
    });
  }

  if (!walletClient) {
    walletClient = owner as WalletClient<Transport, Chain | undefined, Account>;
  }

  return toAccount({
    address: walletClient.account.address,
    async signMessage({ message }) {
      return walletClient.signMessage({ message });
    },
    async signTransaction(_) {
      throw new Error("Smart account signer doesn't need to sign transactions");
    },
    async signTypedData(typedData) {
      return getAction(
        walletClient,
        signTypedData,
        "signTypedData"
        // biome-ignore lint/suspicious/noExplicitAny: any type override
      )(typedData as any);
    }
  });
}
