import type { Abi, Account, Address, Hex, Prettify, TypedData, TypedDataDefinition } from "viem";
import type {
  EntryPointVersion,
  SmartAccount,
  SmartAccountImplementation
} from "viem/account-abstraction";
import {
  entryPoint08Abi,
  entryPoint08Address,
  getUserOperationHash,
  getUserOperationTypedData,
  toSmartAccount
} from "viem/account-abstraction";
import {
  getChainId,
  getCode,
  signAuthorization as viem_signAuthorization,
  signMessage as viem_signMessage,
  signTypedData as viem_signTypedData
} from "viem/actions";
import { verifyAuthorization } from "viem/utils";
import { lowercase } from "../../utils/index.js";
import type { GelatoSmartAccountExtension, GelatoSmartAccountSCWEncoding } from "../index.js";

export type CustomSmartAccountImplementation<
  entryPointAbi extends Abi | readonly unknown[] = Abi,
  entryPointVersion extends EntryPointVersion = EntryPointVersion,
  extend extends GelatoSmartAccountExtension = GelatoSmartAccountExtension,
  eip7702 extends boolean = boolean
> = SmartAccountImplementation<entryPointAbi, entryPointVersion, extend, eip7702>;

export type CustomSmartAccountParameters<
  entryPointAbi extends Abi | readonly unknown[] = Abi,
  entryPointVersion extends EntryPointVersion = EntryPointVersion,
  extend extends GelatoSmartAccountExtension = GelatoSmartAccountExtension,
  eip7702 extends boolean = boolean
> = {
  client: CustomSmartAccountImplementation<
    entryPointAbi,
    entryPointVersion,
    extend,
    eip7702
  >["client"];
  owner: Account;
  entryPoint?: {
    abi: Abi;
    address: Address;
    version: EntryPointVersion;
  };
  authorization?: CustomSmartAccountImplementation<
    entryPointAbi,
    entryPointVersion,
    extend,
    eip7702
  >["authorization"];
  eip7702: eip7702;
  scw: {
    encoding: GelatoSmartAccountSCWEncoding;
  };
} & (eip7702 extends true
  ? { factory?: undefined } | { getFactoryArgs?: undefined }
  :
      | {
          factory: {
            address: Address;
            data: Hex;
          };
        }
      | { getFactoryArgs: () => Promise<ReturnType<typeof toSmartAccount>["getFactoryArgs"]> });

export type CustomSmartAccountReturnType = Prettify<SmartAccount<CustomSmartAccountImplementation>>;

export async function custom<
  entryPointAbi extends Abi | readonly unknown[] = Abi,
  entryPointVersion extends EntryPointVersion = EntryPointVersion,
  extend extends GelatoSmartAccountExtension = GelatoSmartAccountExtension,
  eip7702 extends boolean = boolean
>(
  parameters: CustomSmartAccountParameters<entryPointAbi, entryPointVersion, extend, eip7702>
): Promise<CustomSmartAccountReturnType> {
  const { client, owner, authorization, eip7702, entryPoint: _entryPoint, scw } = parameters;

  if (eip7702 && !authorization) {
    throw new Error("EIP-7702 is enabled. Authorization is required.");
  }

  const erc4337 = Boolean(_entryPoint);

  const entryPoint =
    _entryPoint ??
    ({
      abi: entryPoint08Abi,
      address: entryPoint08Address,
      version: "0.8"
    } as const);

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
      eip7702,
      erc4337,
      scw: { type: "custom", encoding: scw.encoding, version: "unknown" } as const,
      async signAuthorization() {
        if (!eip7702) {
          throw new Error("EIP-7702 must be enabled. No support for non-EIP-7702 accounts.");
        }

        if (!authorization) {
          throw new Error("Authorization is required.");
        }

        const code = await getCode(client, { address: owner.address });

        deployed = Boolean(
          code?.length && code.length > 0 && lowercase(code) === lowercase(authorization.address)
        );

        if (!deployed) {
          const auth = await viem_signAuthorization(client, {
            ...authorization,
            account: authorization.account,
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
      }
    },
    entryPoint,
    authorization,
    async getAddress() {
      return owner.address;
    },
    async encodeCalls() {
      throw new Error("encodeCalls is not implemented for custom accounts");
    },
    async getFactoryArgs() {
      if (eip7702) {
        return { factory: "0x7702", factoryData: "0x" };
      }

      if ("getFactoryArgs" in parameters && typeof parameters.getFactoryArgs === "function") {
        return parameters.getFactoryArgs();
      }

      if (
        "factory" in parameters &&
        parameters.factory &&
        "address" in parameters.factory &&
        "data" in parameters.factory
      ) {
        return {
          factory: parameters.factory.address,
          factoryData: parameters.factory.data
        };
      }

      throw new Error("Factory args are not set");
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

      if (entryPoint.version === "0.8") {
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
  }) as unknown as CustomSmartAccountReturnType;
}
