import type { Call, Hash } from "viem";

export const erc20Address = () => "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as Hash;

export const testCalls: Call[] = [
  {
    to: "0xa8851f5f279eD47a292f09CA2b6D40736a51788E",
    data: "0xd09de08a",
    value: 0n
  }
];
