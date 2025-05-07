import { parseAbi } from "viem";

export const delegationAbi = parseAbi([
  "function execute(bytes32 mode, bytes executionData) payable",
  "function getNonce(uint192 key) returns (uint256)"
]);
