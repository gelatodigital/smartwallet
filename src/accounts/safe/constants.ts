// Taken from permissionless/accounts/safe: https://github.com/pimlicolabs/permissionless.js/blob/main/packages/permissionless/accounts/safe/toSafeSmartAccount.ts

import type { Address } from "viem";

export type SafeVersion = "1.4.1";

export type SupportedEntryPointVersions = "0.7";

export const multiSendAbi = [
  {
    inputs: [
      {
        internalType: "bytes",
        name: "transactions",
        type: "bytes"
      }
    ],
    name: "multiSend",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  }
] as const;

export const enableModulesAbi = [
  {
    inputs: [
      {
        internalType: "address[]",
        name: "modules",
        type: "address[]"
      }
    ],
    name: "enableModules",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;

export const setupAbi = [
  {
    inputs: [
      {
        internalType: "address[]",
        name: "_owners",
        type: "address[]"
      },
      {
        internalType: "uint256",
        name: "_threshold",
        type: "uint256"
      },
      {
        internalType: "address",
        name: "to",
        type: "address"
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes"
      },
      {
        internalType: "address",
        name: "fallbackHandler",
        type: "address"
      },
      {
        internalType: "address",
        name: "paymentToken",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "payment",
        type: "uint256"
      },
      {
        internalType: "address payable",
        name: "paymentReceiver",
        type: "address"
      }
    ],
    name: "setup",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;

export const createProxyWithNonceAbi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_singleton",
        type: "address"
      },
      {
        internalType: "bytes",
        name: "initializer",
        type: "bytes"
      },
      {
        internalType: "uint256",
        name: "saltNonce",
        type: "uint256"
      }
    ],
    name: "createProxyWithNonce",
    outputs: [
      {
        internalType: "contract SafeProxy",
        name: "proxy",
        type: "address"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;

export const proxyCreationCodeAbi = [
  {
    inputs: [],
    name: "proxyCreationCode",
    outputs: [
      {
        internalType: "bytes",
        name: "",
        type: "bytes"
      }
    ],
    stateMutability: "pure",
    type: "function"
  }
] as const;

export const EIP712_SAFE_OPERATION_TYPE_V07 = {
  SafeOp: [
    { name: "safe", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "initCode", type: "bytes" },
    { name: "callData", type: "bytes" },
    { name: "verificationGasLimit", type: "uint128" },
    { name: "callGasLimit", type: "uint128" },
    { name: "preVerificationGas", type: "uint256" },
    { name: "maxPriorityFeePerGas", type: "uint128" },
    { name: "maxFeePerGas", type: "uint128" },
    { name: "paymasterAndData", type: "bytes" },
    { name: "validAfter", type: "uint48" },
    { name: "validUntil", type: "uint48" },
    { name: "entryPoint", type: "address" }
  ]
};

export const SAFE_VERSION_TO_ADDRESSES_MAP: {
  [key in SafeVersion]: {
    [key in "0.7"]: {
      SAFE_MODULE_SETUP_ADDRESS: Address;
      SAFE_4337_MODULE_ADDRESS: Address;
      SAFE_PROXY_FACTORY_ADDRESS: Address;
      SAFE_SINGLETON_ADDRESS: Address;
      MULTI_SEND_ADDRESS: Address;
      MULTI_SEND_CALL_ONLY_ADDRESS: Address;
    };
  };
} = {
  "1.4.1": {
    "0.7": {
      MULTI_SEND_ADDRESS: "0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526",
      MULTI_SEND_CALL_ONLY_ADDRESS: "0x9641d764fc13c8B624c04430C7356C1C7C8102e2",
      SAFE_4337_MODULE_ADDRESS: "0x75cf11467937ce3F2f357CE24ffc3DBF8fD5c226",
      SAFE_MODULE_SETUP_ADDRESS: "0x2dd68b007B46fBe91B9A7c3EDa5A7a1063cB5b47",
      SAFE_PROXY_FACTORY_ADDRESS: "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67",
      SAFE_SINGLETON_ADDRESS: "0x41675C099F32341bf84BFc5382aF534df5C7461a"
    }
  }
};
