import { http, createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const accounts = [
  {
    address: "0x68CeC001aC5997421363680332dF644c5Dd4FA46",
    balance: 10000000000000000000000n,
    privateKey: "0x6cd2c0de46bf9aa69f7ab3868cd51ded388dd382e718cdda3d837efa71836d04"
  },
  {
    address: "0x545218835c73BA5dB7D1F342E880d74a31047476",
    balance: 10000000000000000000000n,
    privateKey: "0x6cd2c0de46bf9aa69f7ab3868cd51ded388dd382e718cdda3d837efa71836d03"
  }
] as const;

export const deployerAccount = privateKeyToAccount(accounts[0].privateKey);
export const sponsorAccount = privateKeyToAccount(accounts[1].privateKey);

export const walletClient = createWalletClient({
  account: deployerAccount,
  chain: sepolia,
  transport: http()
});
