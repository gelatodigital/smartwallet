import {
  type Chain,
  type Hex,
  type StateOverride,
  type Transport,
  ethAddress,
  hexToBytes
} from "viem";
import type { SmartAccount } from "viem/account-abstraction";
import type { EstimateL1GasParameters } from "viem/op-stack";

import type { GelatoWalletClient } from "../actions/index.js";
import { getEstimatedFee, getEstimatedFeeOpStack } from "../oracle/index.js";
import type { Payment } from "../payment/index.js";

const BASE_GAS = 21_000n;
const AUTHORIZATION_GAS = 25_000n;

const calculateCalldataGas = (data: Hex): bigint =>
  hexToBytes(data).reduce((gas, byte) => gas + (byte === 0 ? 4n : 16n), 0n);

export function addDelegationOverride<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends SmartAccount = SmartAccount
>(
  _client: GelatoWalletClient<transport, chain, account>,
  override: StateOverride = []
): StateOverride {
  // if (!client._internal.authorized) {
  //   override.push({
  //     address: client.account.address,
  //     // biome-ignore lint/style/noNonNullAssertion: TODO!
  //     code: delegationCode(client.account.authorization!.address)
  //   });
  // }
  return override;
}

export function addAuthorizationGas<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends SmartAccount = SmartAccount
>(client: GelatoWalletClient<transport, chain, account>, gas: bigint): bigint {
  if (!client._internal.authorization) {
    throw new Error("Internal error: addAuthorizationGas: Authorization has not been set up");
  }

  return client._internal.authorization.authorized ? gas : gas + AUTHORIZATION_GAS;
}

export function subtractBaseAndCalldataGas(gas: bigint, data: Hex): bigint {
  return gas - BASE_GAS - calculateCalldataGas(data);
}

export async function estimateL1GasAndFee<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends SmartAccount = SmartAccount
>(
  client: GelatoWalletClient<transport, chain, account>,
  payment: Payment,
  estimatedGas: bigint,
  data: Hex
): Promise<{
  estimatedFee: bigint;
  estimatedL1Gas: bigint;
}> {
  const paymentToken = payment.type === "erc20" ? payment.token : ethAddress;

  if (client._internal.isOpStack()) {
    // TODO: currently only supports EIP-1559 transactions so we cannot specify authorizationList
    const [estimatedFee, estimatedL1Gas] = await Promise.all([
      getEstimatedFeeOpStack(client.chain.id, paymentToken, estimatedGas, data),
      // TODO: remove once this is returned by the fee oracle
      client.estimateL1Gas({
        to: client.account.address,
        data
      } as EstimateL1GasParameters)
    ]);

    return {
      estimatedFee,
      estimatedL1Gas
    };
  }

  const estimatedFee = await getEstimatedFee(client.chain.id, paymentToken, estimatedGas);

  return {
    estimatedFee,
    estimatedL1Gas: 0n
  };
}
