import type { Call, Hash } from "viem";

// USDC on Base Sepolia
export const erc20Address = () => "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Hash;

export const testCalls: Call[] = [
  {
    to: "0xEEeBe2F778AA186e88dCf2FEb8f8231565769C27",
    data: "0xd09de08a",
    value: 0n
  }
];
