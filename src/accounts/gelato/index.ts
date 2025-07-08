import type {
  Account,
  Address,
  Call,
  Hex,
  Prettify,
  PrivateKeyAccount,
  TypedData,
  TypedDataDefinition
} from "viem";
import { BaseError, decodeAbiParameters, decodeFunctionData, isAddressEqual } from "viem";
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
import { verifyAuthorization } from "viem/utils";

import { delegationAbi as abi } from "../../abis/delegation.js";
import { delegationCode } from "../../constants/index.js";
import { lowercase } from "../../utils/index.js";
import type { GelatoSmartAccountExtension } from "../index.js";

export type GelatoSmartAccountImplementation<eip7702 extends boolean = boolean> =
  SmartAccountImplementation<typeof entryPoint08Abi, "0.8", GelatoSmartAccountExtension, eip7702>;

export type GelatoSmartAccountParameters<eip7702 extends boolean = true> = {
  client: GelatoSmartAccountImplementation<eip7702>["client"];
  owner: Account;
  authorization?: GelatoSmartAccountImplementation<eip7702>["authorization"];
  eip7702?: eip7702;
};

export type GelatoSmartAccountReturnType = Prettify<SmartAccount<GelatoSmartAccountImplementation>>;

export async function gelato<eip7702 extends boolean = true>(
  parameters: GelatoSmartAccountParameters<eip7702>
): Promise<GelatoSmartAccountReturnType> {
  const { client, owner, eip7702: _eip7702, authorization: _authorization } = parameters;

  const eip7702 = _eip7702 ?? true;
  const erc4337 = false;

  if (!eip7702) {
    throw new Error("EIP-7702 must be enabled. No support for non-EIP-7702 accounts.");
  }

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

  const { authorization } = await (async () => {
    if (_authorization) {
      return {
        authorization: _authorization
      };
    }

    return {
      authorization: {
        account: owner,
        address: GELATO_V0_1_DELEGATION_ADDRESS
      }
    };
  })();

  const isDeployed = async () => {
    if (deployed) {
      return true;
    }

    const code = await getCode(client, { address: owner.address });

    deployed = Boolean(
      code?.length &&
        code.length > 0 &&
        lowercase(code) === lowercase(delegationCode(authorization.address))
    );

    return deployed;
  };

  const getNonce = async (parameters?: { key?: bigint }) => {
    return readContract(client, {
      abi,
      address: owner.address,
      functionName: "getNonce",
      args: [parameters?.key ?? 0n],
      stateOverride: (await isDeployed())
        ? undefined
        : [
            {
              address: owner.address,
              code: delegationCode(authorization.address)
            }
          ]
    });
  };

  const account = (await toSmartAccount({
    abi,
    client,
    extend: {
      abi,
      owner,
      eip7702,
      erc4337,
      scw: { type: "gelato", encoding: "gelato", version: "0.1" } as const
    },
    entryPoint,
    authorization: authorization as {
      account: PrivateKeyAccount;
      address: Address;
    },
    async signAuthorization() {
      const _isDeployed = await isDeployed();

      if (!_isDeployed) {
        if (!isAddressEqual(authorization.address, GELATO_V0_1_DELEGATION_ADDRESS)) {
          throw new Error(
            "EIP-7702 authorization delegation address does not match account implementation address"
          );
        }

        const auth = await viem_signAuthorization(client, {
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

    async getAddress() {
      return owner.address;
    },

    async getFactoryArgs() {
      return { factory: "0x7702", factoryData: "0x" };
    },

    async signMessage(parameters) {
      const { message } = parameters;

      return viem_signMessage(client, {
        account: owner,
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
        account: owner
      });
    },

    async getStubSignature() {
      return "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c";
    },

    async signUserOperation(parameters) {
      const { chainId = await getMemoizedChainId(), ...userOperation } = parameters;

      if (entryPoint.version !== "0.8") {
        throw new Error("Only EntryPoint version 0.8 is supported for Gelato accounts");
      }

      const typedData = getUserOperationTypedData({
        chainId,
        entryPointAddress: entryPoint.address,
        userOperation: {
          ...userOperation,
          sender: userOperation.sender ?? (await this.getAddress()),
          signature: "0x"
        }
      });

      const signature = await viem_signTypedData(client, {
        ...typedData,
        account: owner
      });

      return signature;
    }
  })) as unknown as GelatoSmartAccountReturnType;

  // Required since `toSmartAccount` overwrites any provided `isDeployed` implementation
  account.isDeployed = isDeployed;

  // Required since `toSmartAccount` overwrites any provided `getNonce` implementation
  account.getNonce = getNonce;

  return account;
}

/// Constants
const GELATO_V0_1_DELEGATION_ADDRESS: Address = "0x5aF42746a8Af42d8a4708dF238C53F1F71abF0E0";
