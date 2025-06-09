import { type Address, type Hex, concatHex } from "viem";
import { arbitrumSepolia, baseSepolia, inkSepolia, sepolia } from "viem/chains";

/// Constants

export const KERNEL_V3_3_ECDSA_VALIDATOR_KEY = BigInt(
  "0x0000845ADb2C711129d4f3966735eD98a9F09fC4cE570000"
);
export const KERNEL_V3_3_ECDSA_VALIDATOR: Hex = "0x845ADb2C711129d4f3966735eD98a9F09fC4cE57";
export const KERNEL_V3_3_FACTORY_ADDRESS: Hex = "0xE30c76Dc9eCF1c19F6Fec070674E1b4eFfE069FA";
export const KERNEL_V3_3_META_FACTORY_ADDRESS: Hex = "0xd703aaE79538628d27099B8c4f621bE4CCd142d5";
const KERNEL_V3_3_DELEGATION_ADDRESSES: { [chainId: number]: Address } = {
  [sepolia.id]: "0xd6CEDDe84be40893d153Be9d467CD6aD37875b28",
  [baseSepolia.id]: "0xd6CEDDe84be40893d153Be9d467CD6aD37875b28",
  [inkSepolia.id]: "0xd6CEDDe84be40893d153Be9d467CD6aD37875b28",
  [arbitrumSepolia.id]: "0xd6CEDDe84be40893d153Be9d467CD6aD37875b28"
};

export const delegationAddress = (chainId: number) => {
  const address = KERNEL_V3_3_DELEGATION_ADDRESSES[chainId];
  if (!address) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }
  return address;
};

export const kernelV3_3_EcdsaRootIdentifier = () =>
  concatHex(["0x01", KERNEL_V3_3_ECDSA_VALIDATOR]);

export const KernelV3AccountAbi = [
  {
    type: "function",
    name: "initialize",
    inputs: [
      {
        name: "_rootValidator",
        type: "bytes21",
        internalType: "ValidationId"
      },
      { name: "hook", type: "address", internalType: "contract IHook" },
      { name: "validatorData", type: "bytes", internalType: "bytes" },
      { name: "hookData", type: "bytes", internalType: "bytes" },
      { name: "initConfig", type: "bytes[]", internalType: "bytes[]" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  }
] as const;

export const KernelV3FactoryAbi = [
  {
    type: "function",
    name: "createAccount",
    inputs: [
      { name: "data", type: "bytes", internalType: "bytes" },
      { name: "salt", type: "bytes32", internalType: "bytes32" }
    ],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "payable"
  }
] as const;

export const KernelV3MetaFactoryDeployWithFactoryAbi = [
  {
    type: "function",
    name: "deployWithFactory",
    inputs: [
      {
        name: "factory",
        type: "address",
        internalType: "contract KernelFactory"
      },
      { name: "createData", type: "bytes", internalType: "bytes" },
      { name: "salt", type: "bytes32", internalType: "bytes32" }
    ],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "payable"
  }
] as const;
