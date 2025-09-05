import { type Address, concatHex, type Hex } from "viem";

/// Constants

export const KERNEL_V3_3_ECDSA_VALIDATOR_KEY = BigInt(
  "0x0000845ADb2C711129d4f3966735eD98a9F09fC4cE570000"
);
export const KERNEL_V3_3_ECDSA_VALIDATOR: Hex = "0x845ADb2C711129d4f3966735eD98a9F09fC4cE57";
export const KERNEL_V3_3_FACTORY_ADDRESS: Hex = "0x2577507b78c2008Ff367261CB6285d44ba5eF2E9";
export const KERNEL_V3_3_DELEGATION_ADDRESS: Address = "0xd6CEDDe84be40893d153Be9d467CD6aD37875b28";

export const kernelV3_3_EcdsaRootIdentifier = () =>
  concatHex(["0x01", KERNEL_V3_3_ECDSA_VALIDATOR]);

export const KernelV3AccountAbi = [
  {
    inputs: [
      {
        internalType: "ValidationId",
        name: "_rootValidator",
        type: "bytes21"
      },
      { internalType: "contract IHook", name: "hook", type: "address" },
      { internalType: "bytes", name: "validatorData", type: "bytes" },
      { internalType: "bytes", name: "hookData", type: "bytes" },
      { internalType: "bytes[]", name: "initConfig", type: "bytes[]" }
    ],
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;

export const KernelV3FactoryAbi = [
  {
    inputs: [
      { internalType: "bytes", name: "data", type: "bytes" },
      { internalType: "bytes32", name: "salt", type: "bytes32" }
    ],
    name: "createAccount",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "payable",
    type: "function"
  }
] as const;

export const KernelV3MetaFactoryDeployWithFactoryAbi = [
  {
    inputs: [
      {
        internalType: "contract KernelFactory",
        name: "factory",
        type: "address"
      },
      { internalType: "bytes", name: "createData", type: "bytes" },
      { internalType: "bytes32", name: "salt", type: "bytes32" }
    ],
    name: "deployWithFactory",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "payable",
    type: "function"
  }
] as const;
