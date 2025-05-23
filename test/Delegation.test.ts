import { describe, expect, test } from "vitest";

import { erc20Abi } from "viem";
import { delegationAddress, delegationCode } from "../src/constants/index.js";
import { createGelatoSmartWalletClient, erc20, native, sponsored } from "../src/index.js";
import { constants, account, utils, wallet } from "./src/index.js";

describe("Initial Delegation Test", () => {
  test("Delegate with native payment", async () => {
    const { account: testAccount } = await account.getAccount();

    const walletClient = wallet.walletClient(testAccount);

    const gelatoClient = createGelatoSmartWalletClient(walletClient);
    const balanceInitial = await gelatoClient.getBalance({
      address: gelatoClient.account.address
    });

    await gelatoClient.execute({
      payment: native(),
      calls: constants.testCalls
    });

    await utils.waitBlockTime();

    const code = await gelatoClient.getCode({
      address: gelatoClient.account.address
    });

    const balanceFinal = await gelatoClient.getBalance({
      address: gelatoClient.account.address
    });

    expect(code).toBe(
      delegationCode(delegationAddress(gelatoClient.chain.id, "gelato")).toLowerCase()
    );
    expect(balanceFinal).toBeLessThan(balanceInitial);
  });

  test("Delegate with ERC20 payment", async () => {
    const { account: testAccount } = await account.getAccount();

    const walletClient = wallet.walletClient(testAccount);

    const gelatoClient = createGelatoSmartWalletClient(walletClient);
    const balanceInitial = await gelatoClient.getBalance({
      address: gelatoClient.account.address
    });

    const erc20BalanceInitial = await gelatoClient.readContract({
      address: constants.erc20Address(),
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [gelatoClient.account.address]
    });

    await gelatoClient.execute({
      payment: erc20(constants.erc20Address()),
      calls: constants.testCalls
    });

    await utils.waitBlockTime();

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

    expect(code).toBe(
      delegationCode(delegationAddress(gelatoClient.chain.id, "gelato")).toLowerCase()
    );
    expect(balanceFinal).toBe(balanceInitial);
    expect(erc20BalanceFinal).toBeLessThan(erc20BalanceInitial);
  });

  test("Delegate with sponsor payment", async () => {
    const { account: testAccount } = await account.getAccount();
    const walletClient = wallet.walletClient(testAccount);

    const gelatoClient = createGelatoSmartWalletClient(walletClient);
    const balanceInitial = await gelatoClient.getBalance({
      address: gelatoClient.account.address
    });
    const erc20BalanceInitial = await gelatoClient.readContract({
      address: constants.erc20Address(),
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [gelatoClient.account.address]
    });
    const sponsorBalanceInitial = await gelatoClient.getBalance({
      address: account.sponsorAccount.address
    });

    await gelatoClient.execute({
      payment: sponsored("random-key"),
      calls: constants.testCalls
    });

    await utils.waitBlockTime();

    const code = await gelatoClient.getCode({
      address: gelatoClient.account.address
    });

    const balanceFinal = await gelatoClient.getBalance({
      address: gelatoClient.account.address
    });
    const sponsorBalanceFinal = await gelatoClient.getBalance({
      address: account.sponsorAccount.address
    });
    const erc20BalanceFinal = await gelatoClient.readContract({
      address: constants.erc20Address(),
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [gelatoClient.account.address]
    });

    expect(code).toBe(
      delegationCode(delegationAddress(gelatoClient.chain.id, "gelato")).toLowerCase()
    );
    expect(balanceFinal).toBe(balanceInitial);
    expect(erc20BalanceFinal).toBe(erc20BalanceInitial);
    expect(sponsorBalanceFinal).toBeLessThan(sponsorBalanceInitial);
  });
});
