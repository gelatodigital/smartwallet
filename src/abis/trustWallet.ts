import { parseAbi } from "viem";

export const bizGuardAbi = parseAbi([
  "function accountNonce(address account) view returns (uint256)"
]);
