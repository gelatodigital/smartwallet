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

const VALIDATOR_ADDRESS: Address = "0x9A9DB961d0CAefF03B0d9f3124e783469393f75c"; // TODO: update

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
