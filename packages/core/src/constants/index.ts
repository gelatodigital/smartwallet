import type { Address } from "viem";
import { sepolia } from "viem/chains";

export const GELATO_API = "https://api.dev.gelato.digital";

export const EXECUTION_MODE = {
  opData: "0x0100000000007821000100000000000000000000000000000000000000000000"
};

export const DELEGATION_ADDRESSES: { [chainId: number]: Address } = {
  [sepolia.id]: "0x515CCb8F7dE7ff2C70B148DC79827573e5b66ECC"
};
