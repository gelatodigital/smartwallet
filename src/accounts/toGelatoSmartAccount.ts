import type { Address, Call, Hex, Prettify, TypedData, TypedDataDefinition } from "viem";
import { BaseError, decodeAbiParameters, decodeFunctionData, encodeFunctionData } from "viem";
import type { SmartAccount, SmartAccountImplementation } from "viem/account-abstraction";
import { entryPoint08Abi, entryPoint08Address, toSmartAccount } from "viem/account-abstraction";
import type { PrivateKeyAccount } from "viem/accounts";
import { getChainId, getCode, readContract } from "viem/actions";
import { baseSepolia, inkSepolia, sepolia } from "viem/chains";
import { encodeCalls } from "viem/experimental/erc7821";
import { getAction } from "viem/utils";

import { delegationAbi as abi } from "../abis/delegation.js";
import { delegationCode, mode } from "../constants/index.js";
import { lowercase } from "../utils/index.js";

export type ToGelatoSmartAccountParameters = {
  client: GelatoSmartAccountImplementation["client"];
  owner: PrivateKeyAccount;
};

export type ToGelatoSmartAccountReturnType = Prettify<
  SmartAccount<GelatoSmartAccountImplementation>
>;

export type GelatoSmartAccountImplementation = SmartAccountImplementation<
  typeof entryPoint08Abi,
  "0.8",
  { abi: typeof abi; owner: PrivateKeyAccount },
  true
>;

export async function toGelatoSmartAccount(
  parameters: ToGelatoSmartAccountParameters
): Promise<ToGelatoSmartAccountReturnType> {
  const { client, owner } = parameters;

  const entryPoint = {
    abi: entryPoint08Abi,
    address: entryPoint08Address,
    version: "0.8"
  } as const;

  let deployed = false;
  let chainId: number;

  const getMemoizedChainId = async () => {
    if (chainId) return chainId;
    chainId = client.chain
      ? client.chain.id
      : await getAction(client, getChainId, "getChainId")({});
    return chainId;
  };

  const { authorization } = await (async () => {
    const chainId = await getMemoizedChainId();

    return {
      authorization: { account: owner, address: delegationAddress(chainId) }
    };
  })();

  return toSmartAccount({
    authorization,
    abi,
    client,
    extend: { abi, owner },
    entryPoint,

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

    async encodeCalls(calls) {
      return encodeFunctionData({
        abi,
        functionName: "execute",
        // SmartAccount interface is not supporting ERC-7821, thus opMode could not be handled here
        args: [mode("default"), encodeCalls(calls)]
      });
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
      if (deployed) return true;
      const code = await getAction(
        client,
        getCode,
        "getCode"
      )({
        address: owner.address
      });

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
      throw new Error("getStubSignature is not supported");
    },

    async signUserOperation(_) {
      throw new Error("signUserOperation is not supported");
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
