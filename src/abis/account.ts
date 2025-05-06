import { parseAbi } from "viem";

export const abi = parseAbi([
  "function simulateExecute(bytes32 mode, bytes calldata executionData) payable",
  "function execute(bytes32 mode, bytes calldata executionData) payable",
  "function getNonce() returns (uint256)",
  "error SimulationResult(uint256)"
]);
