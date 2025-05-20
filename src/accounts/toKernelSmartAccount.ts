import type { Address, Call, Hex, Prettify, TypedData, TypedDataDefinition } from "viem";
import {
  concatHex,
  decodeAbiParameters,
  decodeFunctionData,
  domainSeparator,
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  getTypesForEIP712Domain,
  hashMessage,
  hashTypedData,
  keccak256,
  slice,
  stringToHex,
  toBytes,
  toHex,
  validateTypedData,
  zeroAddress
} from "viem";
import {
  type SmartAccount,
  type SmartAccountImplementation,
  entryPoint07Abi,
  entryPoint07Address,
  getUserOperationHash,
  toSmartAccount
} from "viem/account-abstraction";
import type { PrivateKeyAccount } from "viem/accounts";
import { getChainId, getCode, readContract } from "viem/actions";
import { baseSepolia, sepolia } from "viem/chains";
import { getAction } from "viem/utils";

import { getSenderAddress } from "permissionless/actions";
import { delegationAbi as abi } from "../abis/delegation.js";

type FactoryArgsHandler = () => Promise<{ factory: Hex; factoryData: Hex }>;
type Authorization = { account: PrivateKeyAccount; address: Address };

export type ToKernelSmartAccountParameters = {
  client: KernelSmartAccountImplementation["client"];
  owner: PrivateKeyAccount;
  address?: Address;
  index?: bigint;
  useMetaFactory?: "optional" | boolean;
};

export type ToKernelSmartAccountReturnType = Prettify<
  SmartAccount<KernelSmartAccountImplementation>
>;

export type KernelSmartAccountImplementation = SmartAccountImplementation<
  typeof entryPoint07Abi,
  "0.7",
  { abi: typeof abi; owner: PrivateKeyAccount }
>;

const getInitializationData = ({
  validatorData
}: {
  validatorData: Hex;
}) => {
  return encodeFunctionData({
    abi: KernelV3AccountAbi,
    functionName: "initialize",
    args: [kernelV3_3_EcdsaRootIdentifier(), zeroAddress, validatorData, "0x", []]
  });
};

const getAccountInitCode = async ({
  validatorData,
  index,
  useMetaFactory
}: {
  validatorData: Hex;
  index: bigint;
  useMetaFactory: boolean;
}): Promise<Hex> => {
  // Build the account initialization data
  const initializationData = getInitializationData({
    validatorData
  });

  if (!useMetaFactory) {
    return encodeFunctionData({
      abi: KernelV3FactoryAbi,
      functionName: "createAccount",
      args: [initializationData, toHex(index, { size: 32 })]
    });
  }

  return encodeFunctionData({
    abi: KernelV3MetaFactoryDeployWithFactoryAbi,
    functionName: "deployWithFactory",
    args: [KERNEL_V3_3_FACTORY_ADDRESS, initializationData, toHex(index, { size: 32 })]
  });
};

export async function toKernelSmartAccount(
  parameters: ToKernelSmartAccountParameters
): Promise<ToKernelSmartAccountReturnType> {
  const { client, owner, useMetaFactory = true, index = 0n, address } = parameters;

  const entryPoint = {
    abi: entryPoint07Abi,
    address: entryPoint07Address,
    version: "0.7"
  } as const;

  let isDelegated = false; // When 7702+4337 is used
  let chainId: number;

  const getMemoizedChainId = async () => {
    if (chainId) return chainId;
    chainId = client.chain
      ? client.chain.id
      : await getAction(client, getChainId, "getChainId")({});
    return chainId;
  };

  const generateInitCode = async (_useMetaFactory: boolean) => {
    return getAccountInitCode({
      validatorData: owner.address,
      index,
      useMetaFactory: _useMetaFactory
    });
  };

  const getFactoryArgsFunc = (_useMetaFactory: boolean) => async () => {
    return {
      factory:
        _useMetaFactory === false ? KERNEL_V3_3_FACTORY_ADDRESS : KERNEL_V3_3_META_FACTORY_ADDRESS,
      factoryData: await generateInitCode(_useMetaFactory)
    };
  };

  const wrappedMessage = async (hash: Hex) => {
    const chainId = await getMemoizedChainId();

    const _domainSeparator = domainSeparator({
      domain: {
        name: "Kernel",
        version: "0.3.3",
        chainId,
        verifyingContract: accountAddress
      }
    });

    const wrappedMessageHash = keccak256(
      encodeAbiParameters(
        [{ type: "bytes32" }, { type: "bytes32" }],
        [keccak256(stringToHex("Kernel(bytes32 hash)")), hash]
      )
    );

    const digest = keccak256(concatHex(["0x1901", _domainSeparator, wrappedMessageHash]));

    return digest;
  };

  const { accountAddress, getFactoryArgs, authorization } = await (async () => {
    const get7702FactoryArgs = async (): Promise<{ factory: Hex; factoryData: Hex }> => {
      return { factory: "0x7702", factoryData: "0x" };
    };

    const getAccountAddressAndFactoryArgs = async (parameters: {
      accountAddress: Address;
      getFactoryArgs: FactoryArgsHandler;
    }): Promise<{
      accountAddress: Address;
      getFactoryArgs: FactoryArgsHandler;
      authorization?: Authorization;
    }> => {
      const { accountAddress, getFactoryArgs } = parameters;

      const code = await getAction(
        client,
        getCode,
        "getCode"
      )({
        address: accountAddress
      });

      const deployed = Boolean(code);

      if (deployed) {
        return {
          accountAddress,
          getFactoryArgs
        };
      }

      const chainId = await getMemoizedChainId();
      isDelegated = true;

      return {
        accountAddress: owner.address,
        getFactoryArgs: get7702FactoryArgs,
        authorization: { account: owner, address: delegationAddress(chainId) }
      };
    };

    let getFactoryArgs = getFactoryArgsFunc(useMetaFactory === "optional" ? true : useMetaFactory);

    if (address && useMetaFactory !== "optional") {
      return getAccountAddressAndFactoryArgs({ accountAddress: address, getFactoryArgs });
    }

    const { factory, factoryData } = await getFactoryArgs();

    let accountAddress = await getSenderAddress(client, {
      factory,
      factoryData,
      entryPointAddress: entryPoint.address
    });

    if (address === accountAddress) {
      return getAccountAddressAndFactoryArgs({ accountAddress, getFactoryArgs });
    }

    if (useMetaFactory === "optional" && accountAddress === zeroAddress) {
      getFactoryArgs = getFactoryArgsFunc(false);
      const { factory, factoryData } = await getFactoryArgs();

      accountAddress = await getSenderAddress(client, {
        factory,
        factoryData,
        entryPointAddress: entryPoint.address
      });
    }

    return getAccountAddressAndFactoryArgs({ accountAddress, getFactoryArgs });
  })();

  return toSmartAccount({
    authorization,
    getFactoryArgs,
    abi,
    client,
    extend: { abi, owner },
    entryPoint,

    async decodeCalls(data) {
      const decoded = decodeFunctionData({
        abi: executeAbi,
        data
      });

      const encodedMode = decoded.args[0];
      const executionCalldata = decoded.args[1];

      const callType = slice(encodedMode, 0, 1);

      // batchcall
      if (callType === "0x01") {
        const [calls] = decodeAbiParameters(
          [
            {
              name: "executionBatch",
              type: "tuple[]",
              components: [
                {
                  name: "target",
                  type: "address"
                },
                {
                  name: "value",
                  type: "uint256"
                },
                {
                  name: "callData",
                  type: "bytes"
                }
              ]
            }
          ],
          executionCalldata
        );

        return calls.map((call) => ({
          to: call.target,
          value: call.value,
          data: call.callData
        }));
      }

      const decodedCall = decodeAbiParameters(
        [
          {
            type: "tuple",
            components: [
              { type: "address", name: "to" },
              { type: "uint256", name: "value" },
              { type: "bytes", name: "data" }
            ]
          }
        ],
        executionCalldata
      ) as [Call];

      return decodedCall;
    },

    async encodeCalls(calls) {
      const mode = {
        type: calls.length > 1 ? "batchcall" : "call",
        revertOnError: false,
        selector: "0x",
        context: "0x"
      };

      if (calls.length === 0) {
        throw new Error("Encode: No calls");
      }

      const parsedCallType =
        mode.type === "call" ? "0x00" : mode.type === "batchcall" ? "0x01" : "0xff";
      const encodedMode = encodePacked(
        ["bytes1", "bytes1", "bytes4", "bytes4", "bytes22"],
        [
          toHex(toBytes(parsedCallType, { size: 1 })),
          toHex(toBytes(mode.revertOnError ? "0x01" : "0x00", { size: 1 })),
          toHex(toBytes("0x0", { size: 4 })),
          toHex(toBytes(mode.selector ?? "0x", { size: 4 })),
          toHex(toBytes(mode.context ?? "0x", { size: 22 }))
        ]
      );

      if (calls.length === 1) {
        const call = calls[0];
        return encodeFunctionData({
          abi: executeAbi,
          functionName: "execute",
          args: [
            encodedMode,
            concatHex([call.to, toHex(call.value ?? 0n, { size: 32 }), call.data ?? "0x"])
          ]
        });
      }

      if (calls.length > 1) {
        return encodeFunctionData({
          abi: executeAbi,
          functionName: "execute",
          args: [
            encodedMode,
            encodeAbiParameters(
              [
                {
                  name: "executionBatch",
                  type: "tuple[]",
                  components: [
                    {
                      name: "target",
                      type: "address"
                    },
                    {
                      name: "value",
                      type: "uint256"
                    },
                    {
                      name: "callData",
                      type: "bytes"
                    }
                  ]
                }
              ],
              [
                calls.map((arg) => {
                  return {
                    target: arg.to,
                    value: arg.value ?? 0n,
                    callData: arg.data ?? "0x"
                  };
                })
              ]
            )
          ]
        });
      }

      throw new Error("Encode: Unsupported call type");
    },

    async getNonce(_parameters?: { key?: bigint }): Promise<bigint> {
      return readContract(client, {
        abi: entryPoint07Abi,
        address: entryPoint07Address,
        functionName: "getNonce",
        args: [accountAddress, KERNEL_V3_3_ECDSA_VALIDATOR_KEY]
      });
    },

    async getAddress() {
      return accountAddress;
    },

    async getStubSignature() {
      return "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c";
    },

    async sign({ hash }) {
      return this.signMessage({ message: hash });
    },

    async signMessage({ message }) {
      if (isDelegated) {
        return await owner.signMessage({ message });
      }

      const wrapped = await wrappedMessage(hashMessage(message));

      const signature = await owner.signMessage({
        message: { raw: wrapped }
      });

      return concatHex([kernelV3_3_EcdsaRootIdentifier(), signature]);
    },

    async signTypedData(parameters) {
      const {
        domain,
        types: _types,
        primaryType,
        message
      } = parameters as TypedDataDefinition<TypedData, string>;

      if (isDelegated) {
        return await owner.signTypedData({
          domain,
          message,
          primaryType,
          types: _types
        });
      }

      const types = {
        EIP712Domain: getTypesForEIP712Domain({
          domain: domain
        }),
        ..._types
      };

      validateTypedData({
        domain,
        message,
        primaryType,
        types
      });

      const typedHash = hashTypedData({ message, primaryType, types, domain });

      const wrapped = await wrappedMessage(typedHash);

      const signature = await owner.signMessage({
        message: { raw: wrapped }
      });

      return concatHex([kernelV3_3_EcdsaRootIdentifier(), signature]);
    },

    async signUserOperation(parameters) {
      const { chainId = await getMemoizedChainId(), ...userOperation } = parameters;

      const hash = getUserOperationHash({
        userOperation: {
          ...userOperation,
          sender: userOperation.sender ?? (await this.getAddress()),
          signature: "0x"
        },
        entryPointAddress: entryPoint.address,
        entryPointVersion: entryPoint.version,
        chainId
      });

      const signature = await owner.signMessage({
        message: { raw: hash }
      });

      return signature;
    }
  });
}

/// Constants

const KERNEL_V3_3_ECDSA_VALIDATOR_KEY = BigInt(
  "0x0000845ADb2C711129d4f3966735eD98a9F09fC4cE570000"
);
const KERNEL_V3_3_ECDSA_VALIDATOR: Hex = "0x845ADb2C711129d4f3966735eD98a9F09fC4cE57";
const KERNEL_V3_3_FACTORY_ADDRESS: Hex = "0xE30c76Dc9eCF1c19F6Fec070674E1b4eFfE069FA";
const KERNEL_V3_3_META_FACTORY_ADDRESS: Hex = "0xd703aaE79538628d27099B8c4f621bE4CCd142d5";
const KERNEL_V3_3_DELEGATION_ADDRESSES: { [chainId: number]: Address } = {
  [sepolia.id]: "0xd6CEDDe84be40893d153Be9d467CD6aD37875b28",
  [baseSepolia.id]: "0xd6CEDDe84be40893d153Be9d467CD6aD37875b28"
  // not deployed on ink sepolia
};

const delegationAddress = (chainId: number) => {
  const address = KERNEL_V3_3_DELEGATION_ADDRESSES[chainId];
  if (!address) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }
  return address;
};

const kernelV3_3_EcdsaRootIdentifier = () => concatHex(["0x01", KERNEL_V3_3_ECDSA_VALIDATOR]);

export const KernelV3AccountAbi = [
  {
    type: "function",
    name: "initialize",
    inputs: [
      {
        name: "_rootValidator",
        type: "bytes21",
        internalType: "ValidationId"
      },
      { name: "hook", type: "address", internalType: "contract IHook" },
      { name: "validatorData", type: "bytes", internalType: "bytes" },
      { name: "hookData", type: "bytes", internalType: "bytes" },
      { name: "initConfig", type: "bytes[]", internalType: "bytes[]" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  }
] as const;

const KernelV3FactoryAbi = [
  {
    type: "function",
    name: "createAccount",
    inputs: [
      { name: "data", type: "bytes", internalType: "bytes" },
      { name: "salt", type: "bytes32", internalType: "bytes32" }
    ],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "payable"
  }
] as const;

const KernelV3MetaFactoryDeployWithFactoryAbi = [
  {
    type: "function",
    name: "deployWithFactory",
    inputs: [
      {
        name: "factory",
        type: "address",
        internalType: "contract KernelFactory"
      },
      { name: "createData", type: "bytes", internalType: "bytes" },
      { name: "salt", type: "bytes32", internalType: "bytes32" }
    ],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "payable"
  }
] as const;

const executeAbi = [
  {
    type: "function",
    name: "execute",
    inputs: [
      {
        name: "execMode",
        type: "bytes32",
        internalType: "ExecMode"
      },
      {
        name: "executionCalldata",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [],
    stateMutability: "payable"
  }
] as const;
