import type {
  Account,
  Address,
  Hex,
  Prettify,
  PrivateKeyAccount,
  TypedData,
  TypedDataDefinition
} from "viem";
import { BaseError, isAddressEqual } from "viem";
import {
  type SmartAccount,
  type SmartAccountImplementation,
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

import { uniswapAbi as abi } from "../../abis/uniswap.js";
import { delegationCode } from "../../constants/index.js";
import { lowercase } from "../../utils/index.js";
import type { GelatoSmartAccountExtension } from "../index.js";

export type UniswapSmartAccountImplementation<eip7702 extends boolean = boolean> =
  SmartAccountImplementation<typeof entryPoint08Abi, "0.8", GelatoSmartAccountExtension, eip7702>;

export type UniswapSmartAccountParameters<eip7702 extends boolean = true> = {
  client: UniswapSmartAccountImplementation<eip7702>["client"];
  owner: Account;
  authorization?: UniswapSmartAccountImplementation<eip7702>["authorization"];
  eip7702?: eip7702;
};

export type UniswapSmartAccountReturnType = Prettify<
  SmartAccount<UniswapSmartAccountImplementation>
>;

export async function uniswap<eip7702 extends boolean = true>(
  parameters: UniswapSmartAccountParameters<eip7702>
): Promise<UniswapSmartAccountReturnType> {
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
        address: UNISWAP_V1_0_DELEGATION_ADDRESS
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

  const account = (await toSmartAccount({
    abi,
    client,
    extend: {
      abi,
      owner,
      eip7702,
      erc4337,
      scw: { type: "uniswap", encoding: "uniswap", version: "1.0" } as const
    },
    entryPoint,
    authorization: authorization as {
      account: PrivateKeyAccount;
      address: Address;
    },
    async signAuthorization() {
      const _isDeployed = await isDeployed();

      if (!_isDeployed) {
        if (!isAddressEqual(authorization.address, UNISWAP_V1_0_DELEGATION_ADDRESS)) {
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
    async decodeCalls() {
      // TODO
      throw new BaseError("Decoding calls is not implemented");
    },

    async encodeCalls(calls, opData?: Hex) {
      return encodeCalls(calls, opData);
    },

    async getNonce(parameters?: { key?: bigint }): Promise<bigint> {
      return readContract(client, {
        abi,
        address: owner.address,
        functionName: "getSeq",
        args: [parameters?.key ?? 0n],
        stateOverride: (await isDeployed())
          ? undefined
          : [
              {
                address: owner.address,
                code: delegationCode(this.authorization.address)
              }
            ]
      });
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
  })) as unknown as UniswapSmartAccountReturnType;

  // Required since `toSmartAccount` overwrites any provided `isDeployed` implementation
  account.isDeployed = isDeployed;

  return account;
}

const UNISWAP_V1_0_DELEGATION_ADDRESS: Address = "0x000000009B1D0aF20D8C6d0A44e162d11F9b8f00";
