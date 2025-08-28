import type { Address, Hex } from "viem";
import type { SignAuthorizationReturnType } from "viem/accounts";

import type { Payment, SponsoredPayment } from "../payment/index.js";
import type { GelatoResponse } from "../relay/index.js";
import { walletSendTransaction } from "../relay/rpc/sendTransaction.js";

type SendTransactionParameters<P extends Payment> = {
  chainId: number;
  to: Address;
  data: Hex;
  payment: P;
  authorizationList?: SignAuthorizationReturnType[];
} & (P extends SponsoredPayment ? { apiKey: string } : { apiKey?: string });

/**
 *
 * @param parameters - Send transaction parameters.
 * @returns Send transaction.
 */
export async function sendTransaction<P extends Payment>(
  parameters: SendTransactionParameters<P>
): Promise<GelatoResponse> {
  const { chainId, to, data, payment, apiKey, authorizationList } = parameters;

  if (payment.type === "sponsored" && !apiKey) {
    throw new Error("ApiKey must be provided for sponsored payment type");
  }

  return await walletSendTransaction({
    chainId,
    to,
    data,
    payment,
    apiKey,
    authorizationList
  });
}
