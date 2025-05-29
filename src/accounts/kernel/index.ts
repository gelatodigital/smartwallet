import type { Address, Call, Hex, Prettify, TypedData, TypedDataDefinition } from "viem";
import {
  BaseError,
  concatHex,
  decodeAbiParameters,
  decodeFunctionData,
  domainSeparator,
  encodeAbiParameters,
  encodeFunctionData,
  getTypesForEIP712Domain,
  hashMessage,
  hashTypedData,
  isAddressEqual,
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
import {
  getChainId,
  getCode,
  readContract,
  signAuthorization as signAuthorizationFromViem
} from "viem/actions";
import { encodeCalls } from "viem/experimental/erc7821";
import { verifyAuthorization } from "viem/utils";
import { delegationAbi as abi } from "../../abis/delegation.js";
import { getSenderAddress } from "../actions/getSenderAddress.js";
import {
  KERNEL_V3_3_ECDSA_VALIDATOR_KEY,
  KERNEL_V3_3_FACTORY_ADDRESS,
  KERNEL_V3_3_META_FACTORY_ADDRESS,
  KernelV3AccountAbi,
  KernelV3FactoryAbi,
  KernelV3MetaFactoryDeployWithFactoryAbi,
  delegationAddress,
  kernelV3_3_EcdsaRootIdentifier
} from "./constants.js";

export type KernelSmartAccountImplementation<eip7702 extends boolean = boolean> =
  SmartAccountImplementation<
    typeof entryPoint07Abi,
    "0.7",
    { abi: typeof abi; owner: PrivateKeyAccount; scw: "kernel" },
    eip7702
  >;

export type KernelSmartAccountParameters<eip7702 extends boolean = boolean> = {
  client: KernelSmartAccountImplementation["client"];
  owner: PrivateKeyAccount;
  eip7702?: eip7702;
  address?: Address;
  index?: bigint;
  useMetaFactory?: boolean;
  authorization?: KernelSmartAccountImplementation["authorization"];
};

export type KernelSmartAccountReturnType = Prettify<SmartAccount<KernelSmartAccountImplementation>>;

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

export async function kernel<eip7702 extends boolean = boolean>(
  parameters: KernelSmartAccountParameters<eip7702>
): Promise<KernelSmartAccountReturnType> {
  const {
    client,
    owner,
    useMetaFactory: _useMetaFactory,
    index = 0n,
    address,
    eip7702: _eip7702,
    authorization: _authorization
  } = parameters;

  const eip7702 = _eip7702 ?? true;
  const useMetaFactory = _useMetaFactory ?? true;

  const entryPoint = {
    abi: entryPoint07Abi,
    address: entryPoint07Address,
    version: "0.7"
  } as const;

  const isDelegated = false; // When 7702+4337 is used
  let chainId: number;

  const getMemoizedChainId = async () => {
    if (chainId) return chainId;
    chainId = client.chain ? client.chain.id : await getChainId(client);
    return chainId;
  };

  const generateInitCode = async (_useMetaFactory: boolean) => {
    return getAccountInitCode({
      validatorData: owner.address,
      index,
      useMetaFactory: _useMetaFactory
    });
  };

  const { authorization } = await (async () => {
    if (_authorization) {
      return {
        authorization: _authorization
      };
    }

    const chainId = await getMemoizedChainId();

    return {
      authorization: { account: owner, address: delegationAddress(chainId) }
    };
  })();

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

  const getFactoryArgsFunc = async (): Promise<{ factory: Hex; factoryData: Hex }> => {
    if (eip7702) {
      return { factory: "0x7702", factoryData: "0x" };
    }

    return {
      factory: useMetaFactory ? KERNEL_V3_3_META_FACTORY_ADDRESS : KERNEL_V3_3_FACTORY_ADDRESS,
      factoryData: await generateInitCode(useMetaFactory)
    };
  };

  const { accountAddress, getFactoryArgs } = await (async (): Promise<{
    accountAddress: Address;
    getFactoryArgs: () => Promise<{ factory: Hex; factoryData: Hex }>;
  }> => {
    if (eip7702) {
      return { accountAddress: owner.address, getFactoryArgs: getFactoryArgsFunc };
    }

    if (address) {
      return { accountAddress: address, getFactoryArgs: getFactoryArgsFunc };
    }

    const { factory, factoryData } = await getFactoryArgsFunc();

    let accountAddress = await getSenderAddress(client, {
      factory,
      factoryData,
      entryPointAddress: entryPoint.address
    });

    if (address === accountAddress) {
      return { accountAddress, getFactoryArgs: getFactoryArgsFunc };
    }

    if (!useMetaFactory && accountAddress === zeroAddress) {
      const { factory, factoryData } = await getFactoryArgsFunc();

      accountAddress = await getSenderAddress(client, {
        factory,
        factoryData,
        entryPointAddress: entryPoint.address
      });
    }

    return { accountAddress, getFactoryArgs: getFactoryArgsFunc };
  })();

  return toSmartAccount({
    authorization,
    getFactoryArgs,
    abi,
    client,
    extend: { abi, owner, scw: "kernel" as const },
    entryPoint,
    async signAuthorization() {
      if (!authorization) {
        return undefined;
      }

      const code = await getCode(client, { address: accountAddress });

      const isDeployed = Boolean(
        !code ||
          code.length === 0 ||
          !code.toLowerCase().startsWith(`0xef0100${authorization.address.slice(2).toLowerCase()}`)
      );

      if (!isDeployed && authorization) {
        if (!isAddressEqual(authorization.address, delegationAddress(chainId))) {
          throw new Error(
            "EIP-7702 authorization delegation address does not match account implementation address"
          );
        }

        const auth = await signAuthorizationFromViem(client, {
          ...authorization,
          chainId: await getMemoizedChainId()
        });

        const verified = await verifyAuthorization({
          authorization: auth,
          address: owner.address
        });

        if (!verified) {
          throw new Error("Authorization verification failed");
        }

        return auth;
      }

      return undefined;
    },
    async decodeCalls(data) {
      const result = decodeFunctionData({
        abi,
        data
      });

      if (result.functionName === "execute") {
        // First argument is the opMode
        const [_, executionData] = result.args as [Hex, Hex];

        const [decodedCalls] = decodeAbiParameters(
          [
            {
              type: "tuple[]",
              components: [
                { type: "address", name: "to" },
                { type: "uint256", name: "value" },
                { type: "bytes", name: "data" }
              ]
            }
          ],
          executionData
        ) as [Call[]];

        const calls: Call[] = decodedCalls;

        return calls;
      }

      throw new BaseError(`unable to decode calls for "${result.functionName}"`);
    },

    async encodeCalls(calls, opData?: Hex) {
      return encodeCalls(calls, opData);
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
