import { slice } from "viem";
import type { PackedUserOperation, UserOperation } from "viem/account-abstraction";

export function toUnpackedUserOperation(packedUserOperation: PackedUserOperation): UserOperation {
  const {
    callData,
    accountGasLimits,
    initCode,
    gasFees,
    nonce,
    paymasterAndData,
    preVerificationGas,
    sender,
    signature
  } = packedUserOperation;

  const verificationGasLimit = BigInt(slice(accountGasLimits, 0, 16));
  const callGasLimit = BigInt(slice(accountGasLimits, 16, 32));

  const maxPriorityFeePerGas = BigInt(slice(gasFees, 0, 16));
  const maxFeePerGas = BigInt(slice(gasFees, 16, 32));

  const userOperation: UserOperation = {
    callData,
    callGasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
    nonce,
    preVerificationGas,
    sender,
    signature,
    verificationGasLimit
  };

  if (initCode !== "0x") {
    userOperation.factory = slice(initCode, 0, 20);
    userOperation.factoryData = slice(initCode, 20);
  }

  if (paymasterAndData !== "0x") {
    userOperation.paymaster = slice(paymasterAndData, 0, 20);
    userOperation.paymasterVerificationGasLimit = BigInt(slice(paymasterAndData, 20, 32));
    userOperation.paymasterPostOpGasLimit = BigInt(slice(paymasterAndData, 32, 48));
    userOperation.paymasterData = slice(paymasterAndData, 48);
  }

  return userOperation;
}
