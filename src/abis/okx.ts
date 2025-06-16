import { parseAbi } from "viem";

export const okxAbi = parseAbi(["function getNonce() returns (uint256)"]);
