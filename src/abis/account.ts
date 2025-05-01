import { parseAbi } from "viem";

export const abi = parseAbi([
  "function simulateExecute(bytes32 mode, bytes calldata executionData) external payable",
  "function execute(bytes32 mode, bytes calldata executionData) external payable",
  "error SimulationResult(uint256)"
]);
