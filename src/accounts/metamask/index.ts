import type { Account, Prettify, TypedData, TypedDataDefinition } from "viem";
import type {
  SmartAccount,
  SmartAccountImplementation,
} from "viem/account-abstraction";
import {
  entryPoint07Abi,
  entryPoint07Address,
  toPackedUserOperation,
  toSmartAccount,
} from "viem/account-abstraction";
import {
  getChainId,
  getCode,
  signAuthorization as viem_signAuthorization,
  signMessage as viem_signMessage,
  signTypedData as viem_signTypedData,
} from "viem/actions";
import { verifyAuthorization } from "viem/utils";
import {
  METAMASK_DELEGATION,
  METAMASK_SIGNABLE_USER_OP_TYPED_DATA,
} from "../../constants/index.js";
import { lowercase } from "../../utils/index.js";
import type { GelatoSmartAccountExtension } from "../index.js";
import { ERC4337Encoding, WalletType } from "../../wallet/index.js";

export type MetamaskSmartAccountImplementation = SmartAccountImplementation<
  typeof entryPoint07Abi,
  "0.7",
  GelatoSmartAccountExtension,
  true
>;

export type MetamaskSmartAccountParameters = {
  client: MetamaskSmartAccountImplementation["client"];
  owner: Account;
};

export type MetamaskSmartAccountReturnType = Prettify<
  SmartAccount<MetamaskSmartAccountImplementation>
>;

export async function metamask(
  parameters: MetamaskSmartAccountParameters
): Promise<MetamaskSmartAccountReturnType> {
  const { client, owner } = parameters;

  if (!client) {
    throw new Error("Client is required for MetaMask smart account");
  }
  if (!owner) {
    throw new Error("Owner is required for MetaMask smart account");
  }

  const entryPoint = {
    abi: entryPoint07Abi,
    address: entryPoint07Address,
    version: "0.7",
  } as const;

  // For MetaMask accounts, we always use EIP-7702 with the MetaMask delegation address
  const authorization = {
    account: owner as any,
    address: METAMASK_DELEGATION.address,
  } as const;

  let deployed = false;
  let chainId: number;

  const getMemoizedChainId = async () => {
    if (chainId) return chainId;
    chainId = client.chain ? client.chain.id : await getChainId(client);
    return chainId;
  };

  return toSmartAccount({
    client,
    extend: {
      owner,
      eip7702: true,
      erc4337: true,
      scw: {
        type: WalletType.Custom,
        encoding: ERC4337Encoding.ERC7579,
        version: "unknown",
      } as const,
      async signAuthorization() {
        if (!authorization) {
          throw new Error("Authorization is required.");
        }

        const code = await getCode(client, { address: owner.address });

        deployed = Boolean(
          code?.length &&
            code.length > 0 &&
            lowercase(code) === lowercase(authorization.address)
        );

        if (!deployed) {
          const auth = await viem_signAuthorization(client, {
            ...authorization,
            account: authorization.account,
            chainId: await getMemoizedChainId(),
          });

          const verified = await verifyAuthorization({
            authorization: auth,
            address: owner.address,
          });

          if (!verified) {
            throw new Error("Authorization verification failed");
          }

          return auth;
        }

        return undefined;
      },
    },
    entryPoint,
    authorization,
    async getAddress() {
      return owner.address;
    },
    async encodeCalls() {
      throw new Error("encodeCalls is not implemented for metamask accounts");
    },
    async getFactoryArgs() {
      return { factory: "0x7702", factoryData: "0x" };
    },
    async signMessage(parameters) {
      const { message } = parameters;

      return viem_signMessage(client, {
        account: owner,
        message,
      });
    },
    async signTypedData(parameters) {
      const { domain, types, primaryType, message } =
        parameters as TypedDataDefinition<TypedData, string>;

      return viem_signTypedData(client, {
        domain,
        message,
        primaryType,
        types,
        account: owner,
      });
    },
    async getStubSignature() {
      return "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c";
    },
    async signUserOperation(parameters) {
      const { chainId = await getMemoizedChainId(), ...userOperation } =
        parameters;

      const packedUserOp = toPackedUserOperation({
        sender: owner.address,
        ...userOperation,
        signature: "0x",
      });

      const signature = await (owner as any).signTypedData({
        domain: {
          chainId: chainId,
          name: METAMASK_DELEGATION.type,
          version: METAMASK_DELEGATION.version,
          verifyingContract: owner.address,
        },
        types: METAMASK_SIGNABLE_USER_OP_TYPED_DATA,
        primaryType: "PackedUserOperation",
        message: { ...packedUserOp, entryPoint: entryPoint.address },
      });

      return signature;
    },
  }) as unknown as MetamaskSmartAccountReturnType;
}
