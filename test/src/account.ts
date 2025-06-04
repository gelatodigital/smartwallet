import { http, createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { getPrivateKey } from "./env.js";

export const deployerAccount = privateKeyToAccount(getPrivateKey());

export const walletClient = createWalletClient({
  account: deployerAccount,
  chain: sepolia,
  transport: http()
});
