import { parseAbi } from "viem";

export const delegationAbi = parseAbi([
  "function execute(bytes32 mode, bytes executionData) payable",
  "function getNonce() returns (uint256)"
]);
