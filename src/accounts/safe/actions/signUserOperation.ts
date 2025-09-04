// Taken from permissionless/accounts/safe: https://github.com/pimlicolabs/permissionless.js/blob/main/packages/permissionless/accounts/safe/toSafeSmartAccount.ts

import {
  type Account,
  type Address,
  type Chain,
  concat,
  concatHex,
  decodeAbiParameters,
  encodeAbiParameters,
  encodePacked,
  type Hex,
  type LocalAccount,
  type OneOf,
  type Transport,
  type UnionPartialBy,
  type WalletClient
} from "viem";
import type { UserOperation } from "viem/account-abstraction";
import {
  EIP712_SAFE_OPERATION_TYPE_V07,
  type SafeVersion,
  type SupportedEntryPointVersions
} from "../constants.js";
import { getDefaultAddresses, getPaymasterAndData } from "../index.js";
import { type EthereumProvider, toOwner } from "./toOwner.js";

export async function signUserOperation(
  parameters: UnionPartialBy<UserOperation, "sender"> & {
    version: SafeVersion;
    entryPoint: {
      address: Address;
      version: SupportedEntryPointVersions;
    };
    owners: Account[];
    account: OneOf<
      EthereumProvider | WalletClient<Transport, Chain | undefined, Account> | LocalAccount
    >;
    chainId: number;
    signatures?: Hex;
    validAfter?: number;
    validUntil?: number;
    safe4337ModuleAddress?: Address;
  }
) {
  const {
    chainId,
    entryPoint,
    validAfter = 0,
    validUntil = 0,
    safe4337ModuleAddress: _safe4337ModuleAddress,
    version,
    owners,
    signatures: existingSignatures,
    account,
    ...userOperation
  } = parameters;

  const { safe4337ModuleAddress } = getDefaultAddresses(version, entryPoint.version, {
    safe4337ModuleAddress: _safe4337ModuleAddress
  });

  const message = {
    callData: userOperation.callData,
    callGasLimit: userOperation.callGasLimit,
    entryPoint: entryPoint.address,
    initCode: userOperation.initCode ?? "0x",
    maxFeePerGas: userOperation.maxFeePerGas,
    maxPriorityFeePerGas: userOperation.maxPriorityFeePerGas,
    nonce: userOperation.nonce,
    paymasterAndData: userOperation.paymasterAndData ?? "0x",
    preVerificationGas: userOperation.preVerificationGas,
    safe: userOperation.sender,
    validAfter: validAfter,
    validUntil: validUntil,
    verificationGasLimit: userOperation.verificationGasLimit
  };

  if ("initCode" in userOperation) {
    message.paymasterAndData = userOperation.paymasterAndData ?? "0x";
  }

  if ("factory" in userOperation) {
    if (userOperation.factory && userOperation.factoryData) {
      message.initCode = concatHex([userOperation.factory, userOperation.factoryData]);
    }
    if (!userOperation.sender) {
      throw new Error("Sender is required");
    }
    message.paymasterAndData = getPaymasterAndData({
      ...userOperation,
      sender: userOperation.sender
    });
  }

  const localOwners = [
    await toOwner({
      owner: account as OneOf<LocalAccount | EthereumProvider>
    })
  ];

  let unPackedSignatures: readonly { signer: Address; data: Hex }[] = [];

  if (existingSignatures) {
    const decoded = decodeAbiParameters(
      [
        {
          components: [
            { name: "signer", type: "address" },
            { name: "data", type: "bytes" }
          ],
          name: "signatures",
          type: "tuple[]"
        }
      ],
      existingSignatures
    );

    unPackedSignatures = decoded[0];
  }

  const signatures: { signer: Address; data: Hex }[] = [
    ...unPackedSignatures,
    ...(await Promise.all(
      localOwners.map(async (localOwner) => ({
        data: await localOwner.signTypedData({
          domain: {
            chainId,
            verifyingContract: safe4337ModuleAddress
          },
          message: message,
          primaryType: "SafeOp",
          types: EIP712_SAFE_OPERATION_TYPE_V07
        }),
        signer: localOwner.address
      }))
    ))
  ];

  if (signatures.length !== owners.length) {
    return encodeAbiParameters(
      [
        {
          components: [
            { name: "signer", type: "address" },
            { name: "data", type: "bytes" }
          ],
          name: "signatures",
          type: "tuple[]"
        }
      ],
      [signatures]
    );
  }

  signatures.sort((left, right) =>
    left.signer.toLowerCase().localeCompare(right.signer.toLowerCase())
  );
  const signatureBytes = concat(signatures.map((sig) => sig.data));

  return encodePacked(["uint48", "uint48", "bytes"], [validAfter, validUntil, signatureBytes]);
}
