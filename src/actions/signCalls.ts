import {
  type Address,
  type Call,
  type Chain,
  encodePacked,
  type Hex,
  type SignAuthorizationReturnType,
  type StateOverride,
  type Transport,
  type TypedDataDefinition
} from "viem";
import { encodeExecuteData } from "viem/experimental/erc7821";
import { delegationAbi } from "../abis/delegation.js";
import type { GelatoSmartAccount } from "../accounts/index.js";
import { delegationCode, type Mode, mode } from "../constants/index.js";
import type { GelatoActionArgs, GelatoWalletClient } from "./index.js";
import { signAuthorizationList } from "./internal/signAuthorizationList.js";

function addDelegationOverride(
  from: Address,
  authorization?: { address: Address },
  override: StateOverride = []
) {
  if (!authorization) return override;

  override.push({
    address: from,
    code: delegationCode(authorization.address)
  });

  return override;
}

async function getOpData<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends GelatoSmartAccount = GelatoSmartAccount
>(
  client: GelatoWalletClient<transport, chain, account>,
  calls: Call[],
  nonceKey: bigint,
  nonce?: bigint
) {
  const _nonce =
    nonce ??
    (await client.readContract({
      abi: delegationAbi,
      address: client.account.address,
      args: [nonceKey],
      functionName: "getNonce",
      stateOverride: addDelegationOverride(client.account.address, client.account.authorization)
    }));

  const typedData = serializeTypedData(
    client.chain.id,
    client.account.address,
    "opData",
    calls,
    _nonce
  );

  const signature = await client.signTypedData({ account: client.account, ...typedData });

  return encodePacked(["uint192", "bytes"], [nonceKey, signature]);
}

const serializeTypedData = (
  chainId: number,
  account: Address,
  executionMode: Mode,
  calls: Call[],
  nonce: bigint
): TypedDataDefinition => ({
  domain: {
    chainId,
    name: "GelatoDelegation",
    verifyingContract: account,
    version: "0.0.1"
  },
  message: {
    calls: calls.map((call) => ({
      data: call.data ?? "0x",
      to: call.to,
      value: call.value ?? 0n
    })),
    mode: mode(executionMode),
    nonce
  },
  primaryType: "Execute",
  types: {
    Call: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" }
    ],
    Execute: [
      { name: "mode", type: "bytes32" },
      { name: "calls", type: "Call[]" },
      { name: "nonce", type: "uint256" }
    ]
  }
});

/**
 *
 * @param parameters - Sign execution calls parameters.
 * @returns Send sponsored calls.
 */
export async function signCalls<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends GelatoSmartAccount = GelatoSmartAccount
>(
  client: GelatoWalletClient<transport, chain, account>,
  parameters: Omit<GelatoActionArgs, "payment">
): Promise<{ authorizationList?: SignAuthorizationReturnType[]; data: Hex }> {
  const { calls } = parameters;

  if (client.account.scw.type !== "gelato") {
    throw new Error("signCalls: Only Gelato SCW is supported");
  }

  const nonce = "nonce" in parameters ? parameters.nonce : undefined;
  const nonceKey =
    "nonceKey" in parameters
      ? (parameters.nonceKey ?? 0n)
      : typeof nonce !== "undefined"
        ? nonce >> 64n
        : 0n;

  const [opData, authorizationList] = await Promise.all([
    getOpData(client, calls, nonceKey, nonce),
    signAuthorizationList(client)
  ]);

  const data = encodeExecuteData({ calls, opData });

  return { authorizationList, data };
}
