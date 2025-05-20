import type { Address, Call, Hex, Prettify, TypedData, TypedDataDefinition } from "viem";
import { BaseError, decodeFunctionData, encodeFunctionData } from "viem";
import {
  type SmartAccount,
  type SmartAccountImplementation,
  entryPoint07Abi,
  entryPoint07Address,
  toSmartAccount
} from "viem/account-abstraction";
import type { PrivateKeyAccount } from "viem/accounts";
import { getCode, readContract } from "viem/actions";
import { baseSepolia, sepolia } from "viem/chains";
import { encodeCalls } from "viem/experimental/erc7821";
import { getAction } from "viem/utils";

import { delegationAbi as abi } from "../abis/delegation.js";
import { delegationCode, mode } from "../constants/index.js";
import { lowercase } from "../utils/index.js";

/* TODO
  1- Handle if ZeroDev Kernel is deployed 
  2- If deployed just utilized that like `permissionless.js`
  3- If not deployed fallback to EIP-7702 delegation case and handle it like GelatoAccount
  4- Handle encode/decode functions
*/

export type ToKernelSmartAccountParameters = {
  client: KernelSmartAccountImplementation["client"];
  owner: PrivateKeyAccount;
};

export type ToKernelSmartAccountReturnType = Prettify<
  SmartAccount<KernelSmartAccountImplementation>
>;

export type KernelSmartAccountImplementation = SmartAccountImplementation<
  typeof entryPoint07Abi,
  "0.7",
  { abi: typeof abi; owner: PrivateKeyAccount },
  true
>;

// for kernel version >=0.3.1
const KERNEL_ECDSA_VALIDATOR_KEY = BigInt("0x0000845ADb2C711129d4f3966735eD98a9F09fC4cE570000");

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

export async function toKernelSmartAccount(
  parameters: ToKernelSmartAccountParameters
): Promise<ToKernelSmartAccountReturnType> {
  const { client, owner } = parameters;

  const entryPoint = {
    abi: entryPoint07Abi,
    address: entryPoint07Address,
    version: "0.7"
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

    async getNonce(_parameters?: { key?: bigint }): Promise<bigint> {
      return readContract(client, {
        abi: entryPoint07Abi,
        address: entryPoint07Address,
        functionName: "getNonce",
        args: [owner.address, KERNEL_ECDSA_VALIDATOR_KEY]
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
