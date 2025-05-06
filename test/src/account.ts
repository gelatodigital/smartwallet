import { http, type Client, createTestClient, parseEther } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { setBalance, writeContract } from "viem/actions";
import { rpcUrl } from "./anvil";

import { erc20Address } from "./constants.js";

import SimpleERC20 from "../contract/SimpleERC20.json";
import { waitBlockTime } from "./utils.js";

const accounts = [
  {
    address: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
    balance: 10000000000000000000000n,
    privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
  },
  {
    address: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    balance: 10000000000000000000000n,
    privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
  }
] as const;

export const deployerAccount = privateKeyToAccount(accounts[0].privateKey);
export const sponsorAccount = privateKeyToAccount(accounts[1].privateKey);

export const testClient = createTestClient({
  account: deployerAccount,
  mode: "anvil",
  transport: http(rpcUrl())
});

export async function getAccount(balance: bigint | undefined = parseEther("100000")) {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  if (balance) {
    // Set native balance
    await setBalance(testClient, {
      address: account.address,
      value: balance
    });

    // Mint ERC20 token
    await writeContract(testClient, {
      address: erc20Address(),
      abi: SimpleERC20.abi,
      args: [account.address, balance],
      chain: null,
      functionName: "mint"
    });

    await waitBlockTime();
  }

  return {
    account,
    privateKey
  };
}
