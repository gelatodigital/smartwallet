import type {
  Account,
  Call,
  Chain,
  Hash,
  PublicActions,
  SignedAuthorizationList,
  Transport,
  WalletClient
} from "viem";
import { getCode } from "viem/actions";
import { encodeExecuteData } from "viem/experimental/erc7821";

import { abi } from "../constants/abi.js";
import { DELEGATION_ADDRESSES } from "../constants/index.js";
import type { Payment } from "../payment/index.js";
import { sponsoredCall } from "../relay";
import { serializeTypedData } from "../utils/eip712.js";
import { lowercase } from "../utils/index.js";

/**
 *
 * @param client - Client.
 * @param parameters - Execution parameters.
 * @returns Transaction hash.
 */
export async function execute<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(
  client: WalletClient<transport, chain, account> & PublicActions<transport, chain, account>,
  parameters: { payment: Payment; calls: Call[] }
): Promise<Hash> {
  const address = client.account.address;
  const { payment, calls } = parameters;

  const bytecode = await getCode(client, { address });
  const isEip7702Authorized =
    bytecode?.length &&
    bytecode.length > 0 &&
    lowercase(bytecode) === lowercase(`0xef0100${DELEGATION_ADDRESSES[client.chain.id].slice(2)}`);

  let authorizationList: SignedAuthorizationList | undefined = undefined;
  if (!isEip7702Authorized) {
    const authorization = await client.signAuthorization({
      account: client.account,
      contractAddress: DELEGATION_ADDRESSES[client.chain.id],
      executor: payment.type === "native" ? "self" : undefined
    });

    authorizationList = [authorization];
  }

  if (payment.type === "erc20") {
    // TODO: request quote from relayer
    // TODO: append erc20 transfer to fee collector to calls
    throw new Error("ERC20 payment not yet supported");
  }

  let opData = undefined;
  if (payment.type !== "native") {
    let nonce = 0n;
    if (!authorizationList) {
      nonce = (await client.readContract({
        address: client.account.address,
        abi,
        functionName: "getNonce"
      })) as bigint;

      console.log("nonce", nonce);
    }

    const typedData = serializeTypedData(client.chain.id, client.account.address, calls, nonce);

    // TODO: add support for passkey signers
    opData = await client.signTypedData({
      account: client.account,
      ...typedData
    });
  }

  switch (payment.type) {
    case "native": {
      return await client.sendTransaction({
        account: client.account,
        to: client.account.address,
        from: client.account.address,
        chain: client.chain,
        authorizationList,
        data: encodeExecuteData({
          calls,
          opData
        })
        // TODO: fix type
      } as any);
    }
    case "sponsored": {
      return await sponsoredCall({
        chainId: client.chain.id,
        target: client.account.address,
        data: encodeExecuteData({
          calls,
          opData
        }),
        sponsorApiKey: payment.apiKey,
        authorizationList
      });
    }
    // TODO: 'erc20'
  }
}
