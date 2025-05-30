import type { Address, Call, Hex, Prettify, TypedData, TypedDataDefinition } from "viem";
import { BaseError, decodeAbiParameters, decodeFunctionData, isAddressEqual } from "viem";
import type { SmartAccount, SmartAccountImplementation } from "viem/account-abstraction";
import {
  entryPoint08Abi,
  entryPoint08Address,
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
import { baseSepolia, inkSepolia, sepolia } from "viem/chains";
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
  owner: PrivateKeyAccount;
  authorization?: GelatoSmartAccountImplementation<eip7702>["authorization"];
  eip7702?: eip7702;
};

export type GelatoSmartAccountReturnType = Prettify<SmartAccount<GelatoSmartAccountImplementation>>;

export async function gelato<eip7702 extends boolean = true>(
  parameters: GelatoSmartAccountParameters<eip7702>
): Promise<GelatoSmartAccountReturnType> {
  const { client, owner, eip7702: _eip7702, authorization: _authorization } = parameters;

  const eip7702 = _eip7702 ?? true;

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

    const chainId = await getMemoizedChainId();

    return {
      authorization: { account: owner, address: delegationAddress(chainId) }
    };
  })();

  return toSmartAccount({
    abi,
    client,
    extend: {
      abi,
      owner,
      eip7702,
      scw: { type: "gelato", encoding: "erc7821", version: "0.0" } as const
    },
    entryPoint,
    authorization,
    async signAuthorization() {
      const isDeployed = await this.isDeployed();

      if (!isDeployed) {
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

    async getNonce(parameters?: { key?: bigint }): Promise<bigint> {
      const isDeployed = await this.isDeployed();

      return readContract(client, {
        abi,
        address: owner.address,
        functionName: "getNonce",
        args: [parameters?.key],
        stateOverride: isDeployed
          ? undefined
          : [
              {
                address: owner.address,
                code: delegationCode(this.authorization.address)
              }
            ]
      });
    },

    async isDeployed() {
      if (deployed) {
        return true;
      }

      const code = await getCode(client, { address: owner.address });

      deployed = Boolean(
        code?.length &&
          code.length > 0 &&
          lowercase(code) === lowercase(delegationCode(this.authorization.address))
      );

      return deployed;
    },

    async getAddress() {
      return owner.address;
    },

    async getFactoryArgs() {
      return { factory: "0x7702", factoryData: "0x" };
    },

    async signMessage(parameters) {
      const { message } = parameters;
      return await owner.signMessage({ message });
    },

    async signTypedData(parameters) {
      const { domain, types, primaryType, message } = parameters as TypedDataDefinition<
        TypedData,
        string
      >;
      return await owner.signTypedData({
        domain,
        message,
        primaryType,
        types
      });
    },

    async getStubSignature() {
      return "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c";
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

const GELATO_V0_0_DELEGATION_ADDRESSES: { [chainId: number]: Address } = {
  [sepolia.id]: "0x11923B4c785D87bb34da4d4E34e9fEeA09179289",
  [baseSepolia.id]: "0x11923B4c785D87bb34da4d4E34e9fEeA09179289",
  [inkSepolia.id]: "0x11923B4c785D87bb34da4d4E34e9fEeA09179289"
};

const delegationAddress = (chainId: number) => {
  const address = GELATO_V0_0_DELEGATION_ADDRESSES[chainId];
  if (!address) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }
  return address;
};
