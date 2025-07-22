import { parseAbi } from "viem";

export const uniswapAbi = parseAbi([
  "function getSeq(uint256 key) external view returns (uint256 seq)"
]);
