import {
  type Address,
  type Call,
  type Hex,
  encodeFunctionData,
  encodePacked,
  parseAbi,
  zeroAddress
} from "viem";
import { delegationAbi } from "../../../abis/delegation";

const VALIDATOR_ADDRESS: Address = "0x50Bb0D492426692ba5fC09B40Ac9Cf4C5754E1c5";

const ABI = parseAbi([
  "function addSession(address signer, uint256 expiry)",
  "function removeSession(address signer)"
]);

export function addSession(signer: Address, expiry: number): Call[] {
  return [
    {
      // TODO: only do this if validator not already added
      to: zeroAddress,
      data: encodeFunctionData({
        abi: delegationAbi,
        functionName: "addValidator",
        args: [VALIDATOR_ADDRESS]
      })
    },
    {
      to: VALIDATOR_ADDRESS,
      data: encodeFunctionData({
        abi: ABI,
        functionName: "addSession",
        args: [signer, BigInt(expiry)]
      })
    }
  ];
}

export function removeSession(signer: Address): Call {
  return {
    to: VALIDATOR_ADDRESS,
    data: encodeFunctionData({
      abi: ABI,
      functionName: "removeSession",
      args: [signer]
    })
  };
}

export function encodeSessionSignature(signer: Address, signature: Hex) {
  return encodePacked(["address", "address", "bytes"], [VALIDATOR_ADDRESS, signer, signature]);
}
