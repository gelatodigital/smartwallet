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
import type { SmartAccount, SmartAccountImplementation } from "viem/account-abstraction";
import {
  entryPoint07Abi,
  entryPoint07Address,
  getUserOperationHash,
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

import { bizGuardAbi as abi } from "../../abis/trustWallet.js";
import { delegationCode } from "../../constants/index.js";
import { lowercase } from "../../utils/index.js";
import type { GelatoSmartAccountExtension } from "../index.js";

export type TrustWalletSmartAccountImplementation<eip7702 extends boolean = boolean> =
  SmartAccountImplementation<typeof entryPoint07Abi, "0.7", GelatoSmartAccountExtension, eip7702>;

export type TrustWalletSmartAccountParameters<eip7702 extends boolean = true> = {
  client: TrustWalletSmartAccountImplementation<eip7702>["client"];
  owner: Account;
  authorization?: TrustWalletSmartAccountImplementation<eip7702>["authorization"];
  eip7702?: eip7702;
};

export type TrustWalletSmartAccountReturnType = Prettify<
  SmartAccount<TrustWalletSmartAccountImplementation>
>;

export async function trustWallet<eip7702 extends boolean = true>(
  parameters: TrustWalletSmartAccountParameters<eip7702>
): Promise<TrustWalletSmartAccountReturnType> {
  const { client, owner, eip7702: _eip7702, authorization: _authorization } = parameters;

  const eip7702 = _eip7702 ?? true;
  const erc4337 = false;

  if (!eip7702) {
    throw new Error("EIP-7702 must be enabled. No support for non-EIP-7702 accounts.");
  }

  const entryPoint = {
    abi: entryPoint07Abi,
    address: entryPoint07Address,
    version: "0.7"
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
        address: trustWalletDelegationAddress(await getMemoizedChainId())
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
      scw: { type: "trustWallet", encoding: "trustWallet", version: "1.0" } as const
    },
    entryPoint,
    authorization: authorization as {
      account: PrivateKeyAccount;
      address: Address;
    },
    async signAuthorization() {
      const _isDeployed = await isDeployed();

      if (!_isDeployed) {
        if (
          !isAddressEqual(
            authorization.address,
            trustWalletDelegationAddress(await getMemoizedChainId())
          )
        ) {
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

    async getNonce(): Promise<bigint> {
      return readContract(client, {
        abi,
        address: trustWalletBizGuardAddress(await getMemoizedChainId()),
        functionName: "accountNonce",
        args: [owner.address]
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

      const signature = await viem_signMessage(client, {
        account: owner,
        message: { raw: hash }
      });

      return signature;
    }
  })) as unknown as TrustWalletSmartAccountReturnType;

  // Required since `toSmartAccount` overwrites any provided `isDeployed` implementation
  account.isDeployed = isDeployed;

  return account;
}

/// Constants
const TRUST_WALLET_V1_0_DELEGATION_ADDRESS: Address = "0xD2e28229F6f2c235e57De2EbC727025A1D0530FB";
const TRUST_WALLET_BIZ_GUARD_ADDRESS: Address = "0x6067203E59E681396335940c4F2Caf6b002815Bc";

const trustWalletDelegationAddress = (chainId: number): Address =>
  chainId === 1 || chainId === 56
    ? TRUST_WALLET_V1_0_DELEGATION_ADDRESS
    : "0x895362E5B5dC18B71e78018552c8E3D4e1955b0c"; // Deployed by Gelato

const trustWalletBizGuardAddress = (chainId: number): Address =>
  chainId === 1 || chainId === 56
    ? TRUST_WALLET_BIZ_GUARD_ADDRESS
    : "0x221cb5b4fe1d76f9f7277de67e3a580ebdd194a7"; // Deployed by Gelato
