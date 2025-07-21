import { erc20Abi } from "viem";
import { beforeAll, describe, expect, test } from "vitest";
import { delegationCode } from "../src/constants/index.js";
import { createGelatoSmartWalletClient, erc20, native, sponsored } from "../src/index.js";
import { deployerAccount, walletClient } from "./src/account.js";
import { getApiKeyStaging } from "./src/env.js";
import { constants } from "./src/index.js";

const delegationAddress = "0x5aF42746a8Af42d8a4708dF238C53F1F71abF0E0";

describe("Initial Delegation Test", () => {
  beforeAll(async () => {
    console.log("Test Account:", deployerAccount.address);
    console.log("Test Chain:", walletClient.chain.name);
    console.log("ERC20 Address:", constants.erc20Address());
  });

  test("Gelato SCW transaction with native payment", async () => {
    console.log("starting test 1");

    const gelatoClient = await createGelatoSmartWalletClient(walletClient, {
      scw: { type: "gelato" }
    });

    console.log("address", gelatoClient.account.address);
    console.log(
      "initial",
      await gelatoClient.getBalance({ address: gelatoClient.account.address })
    );
    console.log(
      "initial latest",
      await gelatoClient.getBalance({ address: gelatoClient.account.address, blockTag: "latest" })
    );

    const balanceInitial = await gelatoClient.getBalance({
      address: gelatoClient.account.address
    });

    const response = await gelatoClient.execute({
      payment: native(),
      calls: constants.testCalls,
      nonceKey: 0n
    });

    const hash = await response.wait("execution", { confirmations: 3 });
    console.log(`Transaction included: ${hash}`);

    await new Promise((r) => setTimeout(r, 5000));

    console.log("after", await gelatoClient.getBalance({ address: gelatoClient.account.address }));
    console.log(
      "after latest",
      await gelatoClient.getBalance({ address: gelatoClient.account.address, blockTag: "latest" })
    );

    const code = await gelatoClient.getCode({
      address: gelatoClient.account.address
    });

    const balanceFinal = await gelatoClient.getBalance({
      address: gelatoClient.account.address
    });

    console.log("finished test 1");

    expect(code).toBe(delegationCode(delegationAddress).toLowerCase());
    expect(balanceFinal).toBeLessThan(balanceInitial);
  });

  test("Gelato SCW transaction with ERC20 payment", async () => {
    console.log("starting test 2");

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
      calls: constants.testCalls,
      nonceKey: 1n
    });

    const hash = await response.wait("execution", { confirmations: 3 });
    console.log(`Transaction included: ${hash}`);

    await new Promise((r) => setTimeout(r, 5000));

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

    console.log("finished test 2");

    expect(code).toBe(delegationCode(delegationAddress).toLowerCase());
    expect(balanceFinal).toBe(balanceInitial);
    expect(erc20BalanceFinal).toBeLessThan(erc20BalanceInitial);
  });

  test("Gelato SCW transaction with sponsor payment", async () => {
    console.log("starting test 3");

    const gelatoClient = await createGelatoSmartWalletClient(walletClient, {
      scw: { type: "gelato" }
    });

    const apiKey = getApiKeyStaging();

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
      payment: sponsored(apiKey),
      calls: constants.testCalls,
      nonceKey: 2n
    });

    const hash = await response.wait("execution", { confirmations: 3 });
    console.log(`Transaction included: ${hash}`);

    await new Promise((r) => setTimeout(r, 5000));

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

    console.log("finished test 3");

    expect(code).toBe(delegationCode(delegationAddress).toLowerCase());
    expect(balanceFinal).toBe(balanceInitial);
    expect(erc20BalanceFinal).toBe(erc20BalanceInitial);
  });
});
