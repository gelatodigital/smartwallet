import { type Hash, erc20Abi } from "viem";
import { beforeAll, describe, expect, test } from "vitest";
import { delegationCode } from "../src/constants/index.js";
import { createGelatoSmartWalletClient, erc20, native, sponsored } from "../src/index.js";
import { deployerAccount, publicClient, walletClient } from "./src/account.js";
import { getApiKeyStaging } from "./src/env.js";
import { constants } from "./src/index.js";

const delegationAddress = "0x11923B4c785D87bb34da4d4E34e9fEeA09179289";

describe("Initial Delegation Test", () => {
  beforeAll(async () => {
    console.log("Test Account:", deployerAccount.address);
    console.log("Test Chain:", walletClient.chain.name);
    console.log("ERC20 Address:", constants.erc20Address());
  });

  test("Delegate with native payment", async () => {
    const gelatoClient = await createGelatoSmartWalletClient(walletClient, {
      scw: { type: "gelato" }
    });

    const balanceInitial = await gelatoClient.getBalance({
      address: gelatoClient.account.address
    });

    const response = await gelatoClient.execute({
      payment: native(),
      calls: constants.testCalls
    });

    console.log(`Gelato id: ${response.id}`);
    const receipt = await response.wait();
    await publicClient.waitForTransactionReceipt({ hash: receipt as Hash });
    console.log(`Tx hash: ${receipt}`);

    const code = await gelatoClient.getCode({
      address: gelatoClient.account.address
    });

    const balanceFinal = await gelatoClient.getBalance({
      address: gelatoClient.account.address
    });

    expect(code).toBe(delegationCode(delegationAddress).toLowerCase());
    expect(balanceFinal).toBeLessThan(balanceInitial);
  });

  test("Delegate with ERC20 payment", async () => {
    const gelatoClient = await createGelatoSmartWalletClient(walletClient, {
      scw: { type: "gelato" }
    });

    const balanceInitial = await gelatoClient.getBalance({
      address: gelatoClient.account.address
    });

    const erc20BalanceInitial = await gelatoClient.readContract({
      address: constants.erc20Address(),
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [gelatoClient.account.address]
    });

    const response = await gelatoClient.execute({
      payment: erc20(constants.erc20Address()),
      calls: constants.testCalls
    });

    console.log(`Gelato id: ${response.id}`);
    const receipt = await response.wait();
    await publicClient.waitForTransactionReceipt({ hash: receipt as Hash });
    console.log(`Tx hash: ${receipt}`);

    const code = await gelatoClient.getCode({
      address: gelatoClient.account.address
    });

    const balanceFinal = await gelatoClient.getBalance({
      address: gelatoClient.account.address
    });

    const erc20BalanceFinal = await gelatoClient.readContract({
      address: constants.erc20Address(),
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [gelatoClient.account.address]
    });

    expect(code).toBe(delegationCode(delegationAddress).toLowerCase());

    expect(balanceFinal).toBe(balanceInitial);
    expect(erc20BalanceFinal).toBeLessThan(erc20BalanceInitial);
  });

  test("Delegate with sponsor payment", async () => {
    const gelatoClient = await createGelatoSmartWalletClient(walletClient, {
      scw: { type: "gelato" }
    });

    const sponsorKey = getApiKeyStaging();

    const balanceInitial = await gelatoClient.getBalance({
      address: gelatoClient.account.address
    });

    const erc20BalanceInitial = await gelatoClient.readContract({
      address: constants.erc20Address(),
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [gelatoClient.account.address]
    });

    const response = await gelatoClient.execute({
      payment: sponsored(sponsorKey),
      calls: constants.testCalls
    });

    console.log(`Gelato id: ${response.id}`);
    const receipt = await response.wait();
    await publicClient.waitForTransactionReceipt({ hash: receipt as Hash });
    console.log(`Tx hash: ${receipt}`);

    const code = await gelatoClient.getCode({
      address: gelatoClient.account.address
    });

    const balanceFinal = await gelatoClient.getBalance({
      address: gelatoClient.account.address
    });

    const erc20BalanceFinal = await gelatoClient.readContract({
      address: constants.erc20Address(),
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [gelatoClient.account.address]
    });

    expect(code).toBe(delegationCode(delegationAddress).toLowerCase());
    expect(balanceFinal).toBe(balanceInitial);
    expect(erc20BalanceFinal).toBe(erc20BalanceInitial);
  });
});
