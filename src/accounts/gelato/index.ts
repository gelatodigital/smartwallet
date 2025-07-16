import type { Account, Address, Call, Hex, Prettify, TypedData, TypedDataDefinition } from "viem";
import { BaseError, decodeAbiParameters, decodeFunctionData } from "viem";
import type { SmartAccount, SmartAccountImplementation } from "viem/account-abstraction";
import {
  entryPoint08Abi,
  entryPoint08Address,
  getUserOperationTypedData,
  toSmartAccount
} from "viem/account-abstraction";
import {
  getChainId,
  getCode,
  readContract,
  signAuthorization as viem_signAuthorization,
  signMessage as viem_signMessage,
  signTypedData as viem_signTypedData
} from "viem/actions";
import { encodeCalls } from "viem/experimental/erc7821";
import { delegationAbi as abi } from "../../abis/delegation.js";
import { delegationCode } from "../../constants/index.js";
import { lowercase } from "../../utils/index.js";
import type { GelatoSmartAccountExtension } from "../index.js";
import type { Validator } from "./validators/index.js";

export * from "./validators/index.js";

export type GelatoSmartAccountImplementation = SmartAccountImplementation<
  typeof entryPoint08Abi,
  "0.8",
  GelatoSmartAccountExtension
>;

export type GelatoSmartAccountParameters = {
  client: GelatoSmartAccountImplementation["client"];
} & (
  | {
      owner: Account;
    }
  | {
      validator: Validator;
    }
);

export type GelatoSmartAccountReturnType = Prettify<SmartAccount<GelatoSmartAccountImplementation>>;

export async function gelato(
  parameters: GelatoSmartAccountParameters
): Promise<GelatoSmartAccountReturnType> {
  const { client } = parameters;

  const owner = "owner" in parameters ? parameters.owner : undefined;
  const validator = "validator" in parameters ? parameters.validator : undefined;

  const address = "owner" in parameters ? parameters.owner.address : parameters.validator.account;
  const signer = "owner" in parameters ? parameters.owner : parameters.validator.signer;

  const entryPoint = {
    abi: entryPoint08Abi,
    address: entryPoint08Address,
    version: "0.8"
  } as const;

  let deployed = false;
  let chainId: number;

  const getMemoizedChainId = async () => {
    if (chainId) return chainId;
    chainId = client.chain ? client.chain.id : await getChainId(client);
    return chainId;
  };

  const isDeployed = async () => {
    if (deployed) {
      return true;
    }

    const code = await getCode(client, { address });

    deployed =
      code !== undefined &&
      lowercase(code) === lowercase(delegationCode(GELATO_V0_1_DELEGATION_ADDRESS));

    return deployed;
  };

  const account = (await toSmartAccount({
    abi,
    client,
    extend: {
      abi,
      eip7702: true,
      erc4337: false,
      validator,
      scw: { type: "gelato", encoding: "gelato", version: "0.1" } as const
    },
    entryPoint,
    authorization: {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      account: undefined as any,
      address: GELATO_V0_1_DELEGATION_ADDRESS
    },
    async signAuthorization() {
      const _isDeployed = await isDeployed();

      if (!_isDeployed) {
        if (!owner) {
          throw Error("Authorization can only be signed by the owner but no owner was provided");
        }

        return await viem_signAuthorization(client, {
          account: owner,
          address: GELATO_V0_1_DELEGATION_ADDRESS,
          chainId: await getMemoizedChainId()
        });
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

    async getNonce(parameters?: { key?: bigint }): Promise<bigint> {
      return readContract(client, {
        abi,
        address,
        functionName: "getNonce",
        args: [parameters?.key],
        stateOverride: (await isDeployed())
          ? undefined
          : [
              {
                address,
                code: delegationCode(GELATO_V0_1_DELEGATION_ADDRESS)
              }
            ]
      });
    },

    async getAddress() {
      return address;
    },

    async getFactoryArgs() {
      return { factory: "0x7702", factoryData: "0x" };
    },

    async signMessage(parameters) {
      const { message } = parameters;

      return viem_signMessage(client, {
        account: signer,
        message
      });
    },

    async signTypedData(parameters) {
      const { domain, types, primaryType, message } = parameters as TypedDataDefinition<
        TypedData,
        string
      >;

      return viem_signTypedData(client, {
        domain,
        message,
        primaryType,
        types,
        account: signer
      });
    },

    async getStubSignature() {
      return "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c";
    },

    async signUserOperation(parameters) {
      const { chainId = await getMemoizedChainId(), ...userOperation } = parameters;

      const typedData = getUserOperationTypedData({
        chainId,
        entryPointAddress: entryPoint.address,
        userOperation: {
          ...userOperation,
          sender: userOperation.sender ?? (await this.getAddress()),
          signature: "0x"
        }
      });

      return viem_signTypedData(client, {
        ...typedData,
        account: signer
      });
    }
  })) as unknown as GelatoSmartAccountReturnType;

  // Required since `toSmartAccount` overwrites any provided `isDeployed` implementation
  account.isDeployed = isDeployed;

  return account;
}

/// Constants
const GELATO_V0_1_DELEGATION_ADDRESS: Address = "0x5aF42746a8Af42d8a4708dF238C53F1F71abF0E0";
