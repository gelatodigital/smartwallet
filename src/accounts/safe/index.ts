// Adapted from permissionless/accounts/safe: https://github.com/pimlicolabs/permissionless.js/blob/main/packages/permissionless/accounts/safe/toSafeSmartAccount.ts

import {
  type Account,
  type Address,
  type Assign,
  BaseError,
  type Chain,
  type Client,
  type Hex,
  type JsonRpcAccount,
  type LocalAccount,
  type OneOf,
  type SignableMessage,
  type Transport,
  type TypedData,
  type TypedDataDefinition,
  type WalletClient,
  concat,
  encodeFunctionData,
  encodePacked,
  getContractAddress,
  hashMessage,
  hashTypedData,
  hexToBigInt,
  keccak256,
  pad,
  toBytes,
  toHex,
  zeroAddress
} from "viem";
import {
  type SmartAccount,
  type SmartAccountImplementation,
  type UserOperation,
  entryPoint06Abi,
  entryPoint07Abi,
  entryPoint07Address,
  toSmartAccount
} from "viem/account-abstraction";
import { getChainId, readContract } from "viem/actions";
import { getAction } from "viem/utils";
import { signUserOperation } from "./actions/signUserOperation.js";
import { type EthereumProvider, toOwner } from "./actions/toOwner.js";
import {
  SAFE_VERSION_TO_ADDRESSES_MAP,
  type SafeVersion,
  createProxyWithNonceAbi,
  enableModulesAbi,
  multiSendAbi,
  setupAbi
} from "./constants.js";

const adjustVInSignature = (
  signingMethod: "eth_sign" | "eth_signTypedData",
  signature: string
): Hex => {
  const ETHEREUM_V_VALUES = [0, 1, 27, 28];
  const MIN_VALID_V_VALUE_FOR_SAFE_ECDSA = 27;
  let signatureV = Number.parseInt(signature.slice(-2), 16);
  if (!ETHEREUM_V_VALUES.includes(signatureV)) {
    throw new Error("Invalid signature");
  }
  if (signingMethod === "eth_sign") {
    if (signatureV < MIN_VALID_V_VALUE_FOR_SAFE_ECDSA) {
      signatureV += MIN_VALID_V_VALUE_FOR_SAFE_ECDSA;
    }
    signatureV += 4;
  }
  if (signingMethod === "eth_signTypedData") {
    if (signatureV < MIN_VALID_V_VALUE_FOR_SAFE_ECDSA) {
      signatureV += MIN_VALID_V_VALUE_FOR_SAFE_ECDSA;
    }
  }
  return (signature.slice(0, -2) + signatureV.toString(16)) as Hex;
};

const generateSafeMessageMessage = <
  const TTypedData extends TypedData | { [key: string]: unknown },
  TPrimaryType extends keyof TTypedData | "EIP712Domain" = keyof TTypedData
>(
  message: SignableMessage | TypedDataDefinition<TTypedData, TPrimaryType>
): Hex => {
  const signableMessage = message as SignableMessage;

  if (typeof signableMessage === "string" || signableMessage.raw) {
    return hashMessage(signableMessage);
  }

  return hashTypedData(message as TypedDataDefinition<TTypedData, TPrimaryType>);
};

const encodeInternalTransaction = (tx: {
  to: Address;
  data: Address;
  value: bigint;
  operation: 0 | 1;
}): string => {
  const encoded = encodePacked(
    // uint8 = 1 byte for operation
    // address = 20 bytes for to address
    // uint256 = 32 bytes for value
    // uint256 = 32 bytes for data length
    // bytes = dynamic length for data
    ["uint8", "address", "uint256", "uint256", "bytes"],
    [tx.operation, tx.to, tx.value, BigInt(tx.data.slice(2).length / 2), tx.data]
  );
  return encoded.slice(2);
};

const encodeMultiSend = (
  txs: {
    to: Address;
    data: Address;
    value: bigint;
    operation: 0 | 1;
  }[]
): `0x${string}` => {
  const data: `0x${string}` = `0x${txs.map((tx) => encodeInternalTransaction(tx)).join("")}`;

  return encodeFunctionData({
    abi: multiSendAbi,
    functionName: "multiSend",
    args: [data]
  });
};

const getInitializerCode = async ({
  owners,
  threshold,
  safeModuleSetupAddress,
  safe4337ModuleAddress,
  multiSendAddress,
  setupTransactions = [],
  safeModules = [],
  paymentToken = zeroAddress,
  payment = BigInt(0),
  paymentReceiver = zeroAddress
}: {
  owners: Address[];
  threshold: bigint;
  safeSingletonAddress: Address;
  safeModuleSetupAddress: Address;
  safe4337ModuleAddress: Address;
  multiSendAddress: Address;
  setupTransactions?: {
    to: Address;
    data: Address;
    value: bigint;
  }[];
  safeModules?: Address[];
  validators?: { address: Address; context: Address }[];
  executors?: {
    address: Address;
    context: Address;
  }[];
  fallbacks?: { address: Address; context: Address }[];
  hooks?: { address: Address; context: Address }[];
  attesters?: Address[];
  attestersThreshold?: number;
  paymentToken?: Address;
  payment?: bigint;
  paymentReceiver?: Address;
}) => {
  const multiSendCallData = encodeMultiSend([
    {
      to: safeModuleSetupAddress,
      data: encodeFunctionData({
        abi: enableModulesAbi,
        functionName: "enableModules",
        args: [[safe4337ModuleAddress, ...safeModules]]
      }),
      value: BigInt(0),
      operation: 1
    },
    ...setupTransactions.map((tx) => ({ ...tx, operation: 0 as 0 | 1 }))
  ]);

  return encodeFunctionData({
    abi: setupAbi,
    functionName: "setup",
    args: [
      owners,
      threshold,
      multiSendAddress,
      multiSendCallData,
      safe4337ModuleAddress,
      paymentToken,
      payment,
      paymentReceiver
    ]
  });
};

export function getPaymasterAndData(unpackedUserOperation: UserOperation) {
  return unpackedUserOperation.paymaster
    ? concat([
        unpackedUserOperation.paymaster,
        pad(toHex(unpackedUserOperation.paymasterVerificationGasLimit || BigInt(0)), {
          size: 16
        }),
        pad(toHex(unpackedUserOperation.paymasterPostOpGasLimit || BigInt(0)), {
          size: 16
        }),
        unpackedUserOperation.paymasterData || ("0x" as Hex)
      ])
    : "0x";
}

const getAccountInitCode = async ({
  owners,
  threshold,
  safeModuleSetupAddress,
  safe4337ModuleAddress,
  safeSingletonAddress,
  multiSendAddress,
  paymentToken,
  payment,
  paymentReceiver,
  saltNonce = BigInt(0),
  setupTransactions = [],
  safeModules = [],
  validators = [],
  executors = [],
  fallbacks = [],
  hooks = [],
  attesters = [],
  attestersThreshold = 0
}: {
  owners: Address[];
  threshold: bigint;
  safeModuleSetupAddress: Address;
  safe4337ModuleAddress: Address;
  safeSingletonAddress: Address;
  multiSendAddress: Address;
  saltNonce?: bigint;
  setupTransactions?: {
    to: Address;
    data: Address;
    value: bigint;
  }[];
  safeModules?: Address[];
  validators?: { address: Address; context: Address }[];
  executors?: {
    address: Address;
    context: Address;
  }[];
  fallbacks?: { address: Address; context: Address }[];
  hooks?: { address: Address; context: Address }[];
  attesters?: Address[];
  attestersThreshold?: number;
  paymentToken?: Address;
  payment?: bigint;
  paymentReceiver?: Address;
}): Promise<Hex> => {
  const initializer = await getInitializerCode({
    owners,
    threshold,
    safeModuleSetupAddress,
    safe4337ModuleAddress,
    multiSendAddress,
    setupTransactions,
    safeModules,
    safeSingletonAddress,
    validators,
    executors,
    fallbacks,
    hooks,
    attesters,
    attestersThreshold,
    paymentToken,
    payment,
    paymentReceiver
  });

  const initCodeCallData = encodeFunctionData({
    abi: createProxyWithNonceAbi,
    functionName: "createProxyWithNonce",
    args: [safeSingletonAddress, initializer, saltNonce]
  });

  return initCodeCallData;
};

export const getDefaultAddresses = (
  safeVersion: SafeVersion,
  entryPointVersion: "0.6" | "0.7",
  {
    addModuleLibAddress: _addModuleLibAddress,
    safeModuleSetupAddress: _safeModuleSetupAddress,
    safe4337ModuleAddress: _safe4337ModuleAddress,
    safeProxyFactoryAddress: _safeProxyFactoryAddress,
    safeSingletonAddress: _safeSingletonAddress,
    multiSendAddress: _multiSendAddress,
    multiSendCallOnlyAddress: _multiSendCallOnlyAddress
  }: {
    addModuleLibAddress?: Address;
    safeModuleSetupAddress?: Address;
    safe4337ModuleAddress?: Address;
    safeProxyFactoryAddress?: Address;
    safeSingletonAddress?: Address;
    multiSendAddress?: Address;
    multiSendCallOnlyAddress?: Address;
  }
) => {
  const safeModuleSetupAddress =
    _safeModuleSetupAddress ??
    _addModuleLibAddress ??
    SAFE_VERSION_TO_ADDRESSES_MAP[safeVersion][entryPointVersion].SAFE_MODULE_SETUP_ADDRESS;
  const safe4337ModuleAddress =
    _safe4337ModuleAddress ??
    SAFE_VERSION_TO_ADDRESSES_MAP[safeVersion][entryPointVersion].SAFE_4337_MODULE_ADDRESS;
  const safeProxyFactoryAddress =
    _safeProxyFactoryAddress ??
    SAFE_VERSION_TO_ADDRESSES_MAP[safeVersion][entryPointVersion].SAFE_PROXY_FACTORY_ADDRESS;
  const safeSingletonAddress =
    _safeSingletonAddress ??
    SAFE_VERSION_TO_ADDRESSES_MAP[safeVersion][entryPointVersion].SAFE_SINGLETON_ADDRESS;
  const multiSendAddress =
    _multiSendAddress ??
    SAFE_VERSION_TO_ADDRESSES_MAP[safeVersion][entryPointVersion].MULTI_SEND_ADDRESS;

  const multiSendCallOnlyAddress =
    _multiSendCallOnlyAddress ??
    SAFE_VERSION_TO_ADDRESSES_MAP[safeVersion][entryPointVersion].MULTI_SEND_CALL_ONLY_ADDRESS;

  return {
    safeModuleSetupAddress,
    safe4337ModuleAddress,
    safeProxyFactoryAddress,
    safeSingletonAddress,
    multiSendAddress,
    multiSendCallOnlyAddress
  };
};

export type SafeSmartAccountParameters<entryPointVersion extends "0.6" | "0.7"> = {
  client: Client<Transport, Chain | undefined, JsonRpcAccount | LocalAccount | undefined>;
  owners: (Account | WalletClient<Transport, Chain | undefined, Account> | EthereumProvider)[];
  threshold?: bigint;
  version: SafeVersion;
  entryPoint?: {
    address: Address;
    version: entryPointVersion;
  };
  safe4337ModuleAddress?: Address;
  safeProxyFactoryAddress?: Address;
  safeSingletonAddress?: Address;
  address?: Address;
  saltNonce?: bigint;
  validUntil?: number;
  validAfter?: number;
  nonceKey?: bigint;
  paymentToken?: Address;
  payment?: bigint;
  paymentReceiver?: Address;
  safeModuleSetupAddress?: Address;
  multiSendAddress?: Address;
  multiSendCallOnlyAddress?: Address;
  safeModules?: Address[];
};

const proxyCreationCodeAbi = [
  {
    inputs: [],
    name: "proxyCreationCode",
    outputs: [
      {
        internalType: "bytes",
        name: "",
        type: "bytes"
      }
    ],
    stateMutability: "pure",
    type: "function"
  }
] as const;

const getAccountAddress = async ({
  client,
  owners,
  threshold,
  safeModuleSetupAddress,
  safe4337ModuleAddress,
  safeProxyFactoryAddress,
  safeSingletonAddress,
  multiSendAddress,
  paymentToken,
  payment,
  paymentReceiver,
  setupTransactions = [],
  safeModules = [],
  saltNonce = BigInt(0),
  validators = [],
  executors = [],
  fallbacks = [],
  hooks = [],
  attesters = [],
  attestersThreshold = 0
}: {
  client: Client;
  owners: Address[];
  threshold: bigint;
  safeModuleSetupAddress: Address;
  safe4337ModuleAddress: Address;
  safeProxyFactoryAddress: Address;
  safeSingletonAddress: Address;
  multiSendAddress: Address;
  setupTransactions: {
    to: Address;
    data: Address;
    value: bigint;
  }[];
  paymentToken?: Address;
  payment?: bigint;
  paymentReceiver?: Address;
  safeModules?: Address[];
  saltNonce?: bigint;
  validators?: { address: Address; context: Address }[];
  executors?: {
    address: Address;
    context: Address;
  }[];
  fallbacks?: { address: Address; context: Address }[];
  hooks?: { address: Address; context: Address }[];
  attesters?: Address[];
  attestersThreshold?: number;
}): Promise<Address> => {
  const proxyCreationCode = await readContract(client, {
    abi: proxyCreationCodeAbi,
    address: safeProxyFactoryAddress,
    functionName: "proxyCreationCode"
  });

  const initializer = await getInitializerCode({
    owners,
    threshold,
    safeModuleSetupAddress,
    safe4337ModuleAddress,
    multiSendAddress,
    setupTransactions,
    safeSingletonAddress,
    safeModules,
    validators,
    executors,
    fallbacks,
    hooks,
    attesters,
    attestersThreshold,
    paymentToken,
    payment,
    paymentReceiver
  });

  const deploymentCode = encodePacked(
    ["bytes", "uint256"],
    [proxyCreationCode, hexToBigInt(safeSingletonAddress)]
  );

  const salt = keccak256(
    encodePacked(
      ["bytes32", "uint256"],
      [keccak256(encodePacked(["bytes"], [initializer])), saltNonce]
    )
  );

  return getContractAddress({
    from: safeProxyFactoryAddress,
    salt,
    bytecode: deploymentCode,
    opcode: "CREATE2"
  });
};

export type SafeSmartAccountImplementation<entryPointVersion extends "0.6" | "0.7" = "0.7"> =
  Assign<
    SmartAccountImplementation<
      entryPointVersion extends "0.6" ? typeof entryPoint06Abi : typeof entryPoint07Abi,
      entryPointVersion
    >,
    { sign: NonNullable<SmartAccountImplementation["sign"]> }
  >;

export type SafeSmartAccountReturnType<entryPointVersion extends "0.6" | "0.7" = "0.7"> =
  SmartAccount<SafeSmartAccountImplementation<entryPointVersion>>;

export async function safe<entryPointVersion extends "0.6" | "0.7">(
  parameters: SafeSmartAccountParameters<entryPointVersion>
): Promise<SafeSmartAccountReturnType<entryPointVersion>> {
  const {
    client,
    owners: _owners,
    address,
    threshold = BigInt(_owners.length),
    version,
    safe4337ModuleAddress: _safe4337ModuleAddress,
    safeProxyFactoryAddress: _safeProxyFactoryAddress,
    safeSingletonAddress: _safeSingletonAddress,
    saltNonce = BigInt(0),
    validUntil = 0,
    validAfter = 0,
    nonceKey,
    paymentToken,
    payment,
    paymentReceiver
  } = parameters;

  const owners = await Promise.all(
    _owners.map(async (owner) => {
      if ("account" in owner) {
        return owner.account;
      }

      if ("request" in owner) {
        return toOwner({
          owner: owner as EthereumProvider
        });
      }

      return owner;
    })
  );

  const localOwners = await Promise.all(
    _owners
      .filter((owner) => {
        if ("type" in owner && owner.type === "local") {
          return true;
        }

        if ("request" in owner) {
          return true;
        }

        if ("account" in owner) {
          // walletClient
          return true;
        }

        return false;
      })
      .map((owner) =>
        toOwner({
          owner: owner as OneOf<
            LocalAccount | EthereumProvider | WalletClient<Transport, Chain | undefined, Account>
          >
        })
      )
  );

  const entryPoint = {
    address: parameters.entryPoint?.address ?? entryPoint07Address,
    abi: (parameters.entryPoint?.version ?? "0.7") === "0.6" ? entryPoint06Abi : entryPoint07Abi,
    version: parameters.entryPoint?.version ?? "0.7"
  } as const;

  const _safeModuleSetupAddress = parameters.safeModuleSetupAddress;
  const _multiSendAddress = parameters.multiSendAddress;
  const safeModules = parameters.safeModules;
  const setupTransactions: {
    to: Address;
    data: Hex;
    value: bigint;
  }[] = [];

  const {
    safeModuleSetupAddress,
    safe4337ModuleAddress,
    safeProxyFactoryAddress,
    safeSingletonAddress,
    multiSendAddress
  } = getDefaultAddresses(version, entryPoint.version, {
    safeModuleSetupAddress: _safeModuleSetupAddress,
    safe4337ModuleAddress: _safe4337ModuleAddress,
    safeProxyFactoryAddress: _safeProxyFactoryAddress,
    safeSingletonAddress: _safeSingletonAddress,
    multiSendAddress: _multiSendAddress
  });

  let accountAddress: Address | undefined = address;

  let chainId: number;

  const getMemoizedChainId = async () => {
    if (chainId) return chainId;
    chainId = client.chain
      ? client.chain.id
      : await getAction(client, getChainId, "getChainId")({});
    return chainId;
  };

  const getFactoryArgs = async () => {
    return {
      factory: safeProxyFactoryAddress,
      factoryData: await getAccountInitCode({
        owners: owners.map((owner) => owner.address),
        threshold,
        safeModuleSetupAddress,
        safe4337ModuleAddress,
        safeSingletonAddress,
        multiSendAddress,
        saltNonce,
        setupTransactions,
        safeModules,
        paymentToken,
        payment,
        paymentReceiver
      })
    };
  };

  if (!accountAddress) {
    accountAddress = await getAccountAddress({
      client,
      owners: owners.map((owner) => owner.address),
      threshold,
      safeModuleSetupAddress,
      safe4337ModuleAddress,
      safeProxyFactoryAddress,
      safeSingletonAddress,
      multiSendAddress,
      saltNonce,
      setupTransactions,
      safeModules,
      paymentToken,
      payment,
      paymentReceiver
    });
  }

  return toSmartAccount({
    client,
    entryPoint,
    getFactoryArgs,
    extend: {
      eip7702: false,
      scw: { type: "safe", encoding: "safe" } as const
    },
    async getAddress() {
      if (accountAddress) return accountAddress;
      return accountAddress;
    },
    async encodeCalls(_calls) {
      throw new BaseError("encodeCalls is not implemented for Safe accounts");
    },
    async decodeCalls(_callData) {
      throw new BaseError("decodeCalls is not implemented for Safe accounts");
    },
    async getNonce(parameters?: { key?: bigint }): Promise<bigint> {
      return readContract(client, {
        abi: entryPoint.abi,
        address: entryPoint.address,
        functionName: "getNonce",
        args: [await this.getAddress(), nonceKey ?? parameters?.key ?? 0n]
      });
    },
    async getStubSignature() {
      return encodePacked(
        ["uint48", "uint48", "bytes"],
        [
          0,
          0,
          `0x${owners
            .map(
              (_) =>
                "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
            )
            .join("")}`
        ]
      );
    },
    async sign({ hash }) {
      return this.signMessage({ message: hash });
    },
    async signMessage({ message }) {
      if (localOwners.length !== owners.length) {
        throw new Error("Owners length mismatch, currently not supported");
      }

      const messageHash = hashTypedData({
        domain: {
          chainId: await getMemoizedChainId(),
          verifyingContract: await this.getAddress()
        },
        types: {
          SafeMessage: [{ name: "message", type: "bytes" }]
        },
        primaryType: "SafeMessage",
        message: {
          message: generateSafeMessageMessage(message)
        }
      });

      const signatures = await Promise.all(
        localOwners.map(async (localOwner) => ({
          signer: localOwner.address,
          data: adjustVInSignature(
            "eth_sign",
            await localOwner.signMessage({
              message: {
                raw: toBytes(messageHash)
              }
            })
          )
        }))
      );

      signatures.sort((left, right) =>
        left.signer.toLowerCase().localeCompare(right.signer.toLowerCase())
      );

      const signatureBytes = concat(signatures.map((sig) => sig.data));

      return signatureBytes;
    },
    async signTypedData(typedData) {
      if (localOwners.length !== owners.length) {
        throw new Error("Owners length mismatch, currently not supported");
      }

      const signatures = await Promise.all(
        localOwners.map(async (localOwner) => ({
          signer: localOwner.address,
          data: adjustVInSignature(
            "eth_signTypedData",
            await localOwner.signTypedData({
              domain: {
                chainId: await getMemoizedChainId(),
                verifyingContract: await this.getAddress()
              },
              types: {
                SafeMessage: [{ name: "message", type: "bytes" }]
              },
              primaryType: "SafeMessage",
              message: {
                message: generateSafeMessageMessage(typedData)
              }
            })
          )
        }))
      );

      signatures.sort((left, right) =>
        left.signer.toLowerCase().localeCompare(right.signer.toLowerCase())
      );

      const signatureBytes = concat(signatures.map((sig) => sig.data));

      return signatureBytes;
    },
    async signUserOperation(parameters) {
      const { chainId = await getMemoizedChainId(), ...userOperation } = parameters;

      if (localOwners.length !== owners.length) {
        throw new Error("Owners length mismatch use safe.signUserOperation");
      }

      let signatures: Hex | undefined = undefined;

      for (const owner of localOwners) {
        signatures = await signUserOperation({
          ...userOperation,
          version,
          entryPoint,
          owners: localOwners,
          account: owner as OneOf<
            EthereumProvider | WalletClient<Transport, Chain | undefined, Account> | LocalAccount
          >,
          chainId: await getMemoizedChainId(),
          signatures,
          validAfter,
          validUntil,
          safe4337ModuleAddress
        });
      }

      if (!signatures) {
        throw new Error("No signatures found");
      }

      return signatures;
    }
  }) as unknown as Promise<SafeSmartAccountReturnType<entryPointVersion>>;
}
