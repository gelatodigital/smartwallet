import { type GelatoSmartWalletClient, track } from "@gelatonetwork/smartwallet";
import type { DefaultError, QueryKey, QueryOptions } from "@tanstack/react-query";
import {
  ConnectorNotConnectedError,
  type WaitForTransactionReceiptErrorType,
  waitForTransactionReceipt
} from "@wagmi/core";
import { type Account, type Chain, type Hash, type Prettify, type Transport, isHash } from "viem";
import type { ShowCallsStatusErrorType } from "viem/actions";
import { type Config, type ResolvedRegister, useChainId, useConfig } from "wagmi";
import {
  type UseQueryParameters,
  type UseQueryReturnType,
  type WaitForTransactionReceiptData,
  type WaitForTransactionReceiptOptions,
  type WaitForTransactionReceiptQueryFnData,
  useQuery
} from "wagmi/query";

import type { GelatoSmartAccount } from "@gelatonetwork/smartwallet/accounts";
import React from "react";
import { useGelatoSmartWalletClient } from "./useGelatoSmartWalletClient.js";
import type { ConfigParameter } from "./useSendTransaction.js";

// Since GelatoSmartWalletClient is complex to cache in React query, it causes exceeded call stack
// here keep a global client and update it when it changes
let globalClient: GelatoSmartWalletClient<Transport, Chain, GelatoSmartAccount> | undefined;

export type WaitForTransactionReceiptQueryKey<
  config extends Config,
  chainId extends config["chains"][number]["id"]
> = ReturnType<typeof waitForTransactionReceiptQueryKey<config, chainId>>;

export function waitForTransactionReceiptQueryKey<
  config extends Config,
  chainId extends config["chains"][number]["id"]
>(
  options: Omit<WaitForTransactionReceiptOptions<config, chainId>, "hash" | "onReplaced"> & {
    id?: string;
  } = {}
) {
  return ["waitForTransactionReceipt", options] as const;
}

export type QueryParameter<
  queryFnData = unknown,
  error = DefaultError,
  data = queryFnData,
  queryKey extends QueryKey = QueryKey
> = {
  query?:
    | Omit<
        UseQueryParameters<queryFnData, error, data, queryKey>,
        "queryFn" | "queryHash" | "queryKey" | "queryKeyHashFn" | "throwOnError"
      >
    | undefined;
};

function waitForTransactionReceiptQueryOptions<
  config extends Config,
  chainId extends config["chains"][number]["id"] = config["chains"][number]["id"]
>(
  config: config,
  options: Omit<WaitForTransactionReceiptOptions<config, chainId>, "hash" | "onReplaced"> & {
    id?: string;
  }
) {
  return {
    async queryFn({ queryKey }) {
      const { scopeKey: _, id, ...parameters } = queryKey[1];

      if (!id) throw new Error("id is required");

      if (!isHash(id)) {
        throw new Error("task id is required");
      }

      let txHash: string;
      if (globalClient) {
        txHash = await track(id, globalClient).wait();
      } else {
        txHash = id;
      }

      const status = await waitForTransactionReceipt(config, {
        hash: txHash as Hash,
        ...options,
        ...parameters
      });
      return status;
    },
    queryKey: waitForTransactionReceiptQueryKey(options),
    retry(failureCount, error) {
      if (error instanceof ConnectorNotConnectedError) return false;
      return failureCount < 3;
    }
  } as const satisfies QueryOptions<
    WaitForTransactionReceiptQueryFnData<config, chainId>,
    WaitForTransactionReceiptErrorType | ShowCallsStatusErrorType,
    WaitForTransactionReceiptData<config, chainId>,
    WaitForTransactionReceiptQueryKey<config, chainId>
  >;
}

export type UseWaitForTransactionReceiptReturnType<
  config extends Config = Config,
  chainId extends config["chains"][number]["id"] = config["chains"][number]["id"],
  selectData = WaitForTransactionReceiptData<config, chainId>
> = UseQueryReturnType<selectData, WaitForTransactionReceiptErrorType | ShowCallsStatusErrorType>;

export type UseWaitForTransactionReceiptParameters<
  config extends Config = Config,
  chainId extends config["chains"][number]["id"] = config["chains"][number]["id"],
  selectData = WaitForTransactionReceiptData<config, chainId>
> = Prettify<
  Omit<WaitForTransactionReceiptOptions<config, chainId>, "hash" | "onReplaced"> & {
    id?: string;
  } & ConfigParameter<config> &
    QueryParameter<
      WaitForTransactionReceiptQueryFnData<config, chainId>,
      WaitForTransactionReceiptErrorType,
      selectData,
      WaitForTransactionReceiptQueryKey<config, chainId>
    >
>;

export function useWaitForTransactionReceipt<
  config extends Config = ResolvedRegister["config"],
  chainId extends config["chains"][number]["id"] = config["chains"][number]["id"],
  selectData = WaitForTransactionReceiptData<config, chainId>
>(
  parameters: UseWaitForTransactionReceiptParameters<config, chainId, selectData> = {}
): UseWaitForTransactionReceiptReturnType<config, chainId, selectData> {
  const { query = {} } = parameters;
  const config = useConfig(parameters);
  const chainId = useChainId({ config });
  const { client } = useGelatoSmartWalletClient();

  React.useEffect(() => {
    globalClient = client;
  }, [client]);

  const enabled = Boolean(parameters.id && (query.enabled ?? true));

  const options = waitForTransactionReceiptQueryOptions(config, {
    ...parameters,
    chainId: parameters.chainId ?? chainId
  });

  return useQuery({
    ...query,
    ...options,
    enabled
  }) as UseWaitForTransactionReceiptReturnType<config, chainId, selectData>;
}
