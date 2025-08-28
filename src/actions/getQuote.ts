import type { Address, Hex } from "viem";
import type { SignAuthorizationReturnType } from "viem/accounts";

import type { Payment } from "../payment/index.js";
import { walletGetQuote } from "../relay/rpc/getQuote.js";
import type { Quote } from "../relay/rpc/interfaces/index.js";

/**
 *
 * @param parameters - Quote parameters.
 * @returns Quote of transaction.
 */
export async function getQuote(
  parameters:
    | {
        chainId: number;
        to: Address;
        data: Hex;
        payment: Payment;
        authorizationList?: SignAuthorizationReturnType[];
      }
    | {
        chainId: number;
        gasUsed: string;
        payment: Payment;
        gasUsedL1?: string;
      }
): Promise<Quote> {
  return (await walletGetQuote(parameters)).quote;
}
