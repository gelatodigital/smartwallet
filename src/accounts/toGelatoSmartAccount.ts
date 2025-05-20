import type { Address, Call, Hex, Prettify, TypedData, TypedDataDefinition } from "viem";
import { BaseError, decodeFunctionData, encodeFunctionData } from "viem";
import type { SmartAccount, SmartAccountImplementation } from "viem/account-abstraction";
import { entryPoint08Abi, entryPoint08Address, toSmartAccount } from "viem/account-abstraction";
import type { PrivateKeyAccount } from "viem/accounts";
import { getCode, readContract } from "viem/actions";
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

  return toSmartAccount({
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    authorization: { account: owner, address: delegationAddress(client.chain!.id) },
    abi,
    client,
    extend: { abi, owner }, // not removing abi from here as this will be a breaking change
    entryPoint,

    async decodeCalls(data) {
      const result = decodeFunctionData({
        abi,
        data
      });

      if (result.functionName === "execute") {
        // TODO: handle opMode
        const [_, executionData] = result.args as [Hex, Hex];

        const callsOffset = Number(BigInt(`0x${executionData.slice(2, 66)}`));
        const callsLengthHex = `0x${executionData.slice(2 + callsOffset * 2, 2 + callsOffset * 2 + 64)}`;
        const callsLength = Number(BigInt(callsLengthHex));

        const callsData = executionData.slice(2 + callsOffset * 2 + 64);

        const calls: Call[] = [];
        let offset = 0;
        for (let i = 0; i < callsLength; i++) {
          // Each call has 3 components: to (address), value (uint256), and data (bytes)

          // Extract 'to' address (20 bytes)
          const to = `0x${callsData.slice(offset, offset + 40)}` as Address;
          offset += 40;

          // Extract 'value' (32 bytes)
          const valueHex = `0x${callsData.slice(offset, offset + 64)}`;
          const value = BigInt(valueHex);
          offset += 64;

          // Extract data length and data
          const dataOffsetRelative = Number(BigInt(`0x${callsData.slice(offset, offset + 64)}`));
          offset += 64;

          // Calculate absolute offset for data within the callsData
          const dataStartPos = dataOffsetRelative * 2;
          const dataLengthHex = `0x${callsData.slice(dataStartPos, dataStartPos + 64)}`;
          const dataLength = Number(BigInt(dataLengthHex));

          // Extract the actual data bytes
          const data =
            dataLength === 0
              ? "0x"
              : (`0x${callsData.slice(dataStartPos + 64, dataStartPos + 64 + dataLength * 2)}` as Hex);

          calls.push({ to, value, data });
        }

        return calls;
      }
      throw new BaseError(`unable to decode calls for "${result.functionName}"`);
    },

    async encodeCalls(calls) {
      return encodeFunctionData({
        abi,
        functionName: "execute",
        // TODO handle opMode
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

    async getStubSignature() {
      throw new Error("getStubSignature is not supported");
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

    async signUserOperation(_) {
      throw new Error("signUserOperation is not supported");
    }
  });
}
