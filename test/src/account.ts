import { http, createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { getPrivateKey } from "./env.js";

export const deployerAccount = privateKeyToAccount(getPrivateKey());

export const walletClient = createWalletClient({
  account: deployerAccount,
  chain: baseSepolia,
  transport: http()
});
