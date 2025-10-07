import { type Address, type Call, encodeFunctionData, parseAbi, zeroAddress } from "viem";
import { delegationAbi } from "../../../abis/delegation";

export const VALIDATOR_ADDRESS: Address = "0xF1142FDd8179747DE0aD5FE1Cecaf645E727093a";

const ABI = parseAbi([
  "function addSession(address signer, uint256 expiry)",
  "function removeSession(address signer)"
]);

export function addSession(signer: Address, expiry: number): Call[] {
  return [
    {
      data: encodeFunctionData({
        abi: delegationAbi,
        args: [VALIDATOR_ADDRESS],
        functionName: "addValidator"
      }),
      // TODO: only do this if validator not already added
      to: zeroAddress
    },
    {
      data: encodeFunctionData({
        abi: ABI,
        args: [signer, BigInt(expiry)],
        functionName: "addSession"
      }),
      to: VALIDATOR_ADDRESS
    }
  ];
}

export function removeSession(signer: Address): Call {
  return {
    data: encodeFunctionData({
      abi: ABI,
      args: [signer],
      functionName: "removeSession"
    }),
    to: VALIDATOR_ADDRESS
  };
}
