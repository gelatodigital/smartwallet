import { decode7579Calls, encode7579Calls } from "permissionless";
import type { Address, Call, Hex, Prettify, TypedData, TypedDataDefinition } from "viem";
import {
  BaseError,
  concatHex,
  decodeFunctionData,
  domainSeparator,
  encodeAbiParameters,
  encodeFunctionData,
  getTypesForEIP712Domain,
  hashMessage,
  hashTypedData,
  keccak256,
  stringToHex,
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
import { getCode, readContract } from "viem/actions";
import { baseSepolia, sepolia } from "viem/chains";
import { getAction } from "viem/utils";

import { getSenderAddress } from "permissionless/actions";
import { delegationAbi as abi } from "../abis/delegation.js";

/* TODO
  1- Handle if ZeroDev Kernel is deployed 
  2- If deployed just utilized that like `permissionless.js`
  3- If not deployed fallback to EIP-7702 delegation case and handle it like GelatoAccount
  4- Handle encode/decode functions (use permissionless for now, then migrate to us only)
*/

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

// for kernel version >=0.3.1
const KERNEL_ECDSA_VALIDATOR_KEY = BigInt("0x0000845ADb2C711129d4f3966735eD98a9F09fC4cE570000");
const KERNEL_ECDSA_VALIDATOR: Hex = "0x845ADb2C711129d4f3966735eD98a9F09fC4cE57";
const KERNEL_FACTORY_ADDRESS: Hex = "0xE30c76Dc9eCF1c19F6Fec070674E1b4eFfE069FA";
const KERNEL_META_FACTORY_ADDRESS: Hex = "0xd703aaE79538628d27099B8c4f621bE4CCd142d5";

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

const getInitializationData = ({
  validatorData
}: {
  validatorData: Hex;
}) => {
  return encodeFunctionData({
    abi: KernelV3_1AccountAbi,
    functionName: "initialize",
    args: [concatHex(["0x01", KERNEL_ECDSA_VALIDATOR]), zeroAddress, validatorData, "0x", []]
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

  // Build the account init code

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
    args: [KERNEL_FACTORY_ADDRESS, initializationData, toHex(index, { size: 32 })]
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

  let isDelegated = false;

  const getAccountAddressAndFactoryArgs = async (parameters: {
    accountAddress: Address;
    getFactoryArgs: () => Promise<{ factory: Hex; factoryData: Hex }>;
  }): Promise<{
    accountAddress: Address;
    getFactoryArgs: () => Promise<{ factory: Hex; factoryData: Hex }>;
    authorization?: { account: PrivateKeyAccount; address: Address };
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
      return { accountAddress, getFactoryArgs, authorization: undefined };
    }

    isDelegated = true;
    return {
      accountAddress: owner.address,
      getFactoryArgs: get7702FactoryArgs,
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      authorization: { account: owner, address: delegationAddress(client.chain!.id) }
    };
  };

  const generateInitCode = async (_useMetaFactory: boolean) => {
    return getAccountInitCode({
      validatorData: owner.address,
      index,
      useMetaFactory: _useMetaFactory
    });
  };

  const get7702FactoryArgs = async (): Promise<{ factory: Hex; factoryData: Hex }> => {
    return { factory: "0x7702", factoryData: "0x" };
  };

  const getFactoryArgsFunc = (_useMetaFactory: boolean) => async () => {
    return {
      factory: _useMetaFactory === false ? KERNEL_FACTORY_ADDRESS : KERNEL_META_FACTORY_ADDRESS,
      factoryData: await generateInitCode(_useMetaFactory)
    };
  };

  const { accountAddress, getFactoryArgs, authorization } = await (async () => {
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
    extend: { abi, owner }, // not removing abi from here as this will be a breaking change
    entryPoint,

    async decodeCalls(data) {
      return decode7579Calls(data).callData;
    },

    async encodeCalls(calls) {
      return encode7579Calls({
        mode: {
          type: calls.length > 1 ? "batchcall" : "call",
          revertOnError: false,
          selector: "0x",
          context: "0x"
        },
        callData: calls
      });
    },

    async getNonce(_parameters?: { key?: bigint }): Promise<bigint> {
      return readContract(client, {
        abi: entryPoint07Abi,
        address: entryPoint07Address,
        functionName: "getNonce",
        args: [accountAddress, KERNEL_ECDSA_VALIDATOR_KEY]
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

      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      const chainId = client.chain!.id;

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
          [keccak256(stringToHex("Kernel(bytes32 hash)")), hashMessage(message)]
        )
      );

      const digest = keccak256(concatHex(["0x1901", _domainSeparator, wrappedMessageHash]));

      return owner.signMessage({
        message: { raw: digest }
      });
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

      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      const chainId = client.chain!.id;

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
          [keccak256(stringToHex("Kernel(bytes32 hash)")), typedHash]
        )
      );

      const digest = keccak256(concatHex(["0x1901", _domainSeparator, wrappedMessageHash]));

      return owner.signMessage({
        message: { raw: digest }
      });
    },

    async signUserOperation(parameters) {
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      const { chainId = client.chain!.id, ...userOperation } = parameters;

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

export const KernelV3_1AccountAbi = [
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
