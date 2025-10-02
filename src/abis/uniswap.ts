import { parseAbi } from "viem";

export const uniswapAbi = parseAbi([
  "function getSeq(uint256 key) external view returns (uint256 seq)",
  "function executeUserOp(PackedUserOperation userOp, bytes32)",
  "struct PackedUserOperation {address sender; uint256 nonce; bytes initCode; bytes callData; bytes32 accountGasLimits; uint256 preVerificationGas; bytes32 gasFees; bytes paymasterAndData; bytes signature;}"
]);
