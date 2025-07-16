import { type Address, type Call, encodeFunctionData, parseAbi, zeroAddress } from "viem";
import { delegationAbi } from "../../../abis/delegation";

const VALIDATOR_ADDRESS: Address = "0xF1142FDd8179747DE0aD5FE1Cecaf645E727093a";

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
