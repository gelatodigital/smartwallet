import type { Call, Hash } from "viem";

// USDC on Base Sepolia
export const erc20Address = () => "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Hash;

export const testCalls: Call[] = [
  {
    to: "0xa8851f5f279eD47a292f09CA2b6D40736a51788E",
    data: "0xd09de08a",
    value: 0n
  }
];
