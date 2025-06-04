import { type GelatoSmartWalletClient, type Payment, native } from "@gelatonetwork/smartwallet";
import type { GelatoSmartAccount } from "@gelatonetwork/smartwallet/accounts";
import { type MutateOptions, type MutationOptions, useMutation } from "@tanstack/react-query";
import { sendTransaction } from "@wagmi/core";
import type {
  Chain,
  Prettify,
  SendCallsErrorType,
  SendTransactionErrorType,
  Transport
} from "viem";
import { type Config, type ResolvedRegister, useConfig } from "wagmi";
import type {
  SendTransactionVariables,
  UseMutationParameters,
  UseMutationReturnType
} from "wagmi/query";

import { useGelatoSmartWalletClient } from "./useGelatoSmartWalletClient.js";

const sendTransactionMutationOptions = <config extends Config>(
  config: config,
  parameters: {
    client?: GelatoSmartWalletClient<Transport, Chain, GelatoSmartAccount>;
    payment?: Payment;
  } = {}
) => {
  return {
    async mutationFn(variables) {
      if (parameters.client) {
        const client = parameters.client;

        const result = await client.execute({
          payment: parameters.payment ?? native(),
          calls: [
            {
              // biome-ignore lint/suspicious/noExplicitAny: variables will include to & data/value
              ...(variables as any)
            }
          ]
        });

        return result.id;
      }

      return sendTransaction(config, variables);
    },
    mutationKey: ["sendTransaction"]
  } as const satisfies MutationOptions<
    SendTransactionData,
    SendTransactionErrorType | SendCallsErrorType,
    SendTransactionVariables<config, config["chains"][number]["id"]>
  >;
};

export type SendTransactionData = string;

export type SendTransactionMutate<config extends Config, context = unknown> = <
  chainId extends config["chains"][number]["id"]
>(
  variables: SendTransactionVariables<config, chainId>,
  options?:
    | Prettify<
      MutateOptions<
        SendTransactionData,
        SendTransactionErrorType | SendCallsErrorType,
        Prettify<SendTransactionVariables<config, chainId>>,
        context
      >
    >
    | undefined
) => void;

export type SendTransactionMutateAsync<config extends Config, context = unknown> = <
  chainId extends config["chains"][number]["id"]
>(
  variables: SendTransactionVariables<config, chainId>,
  options?:
    | Prettify<
      MutateOptions<
        SendTransactionData,
        SendTransactionErrorType | SendCallsErrorType,
        Prettify<SendTransactionVariables<config, chainId>>,
        context
      >
    >
    | undefined
) => Promise<SendTransactionData>;

export type ConfigParameter<config extends Config = Config> = {
  config?: Config | config | undefined;
};

export type UseSendTransactionParameters<
  config extends Config = ResolvedRegister["config"],
  context = unknown
> = Prettify<
  ConfigParameter<config> & {
    payment?: Payment;
    mutation?:
    | UseMutationParameters<
      SendTransactionData,
      SendTransactionErrorType | SendCallsErrorType,
      SendTransactionVariables<config, config["chains"][number]["id"]>,
      context
    >
    | undefined;
  }
>;

export type UseSendTransactionReturnType<
  config extends Config = Config,
  context = unknown
> = Prettify<
  UseMutationReturnType<
    SendTransactionData,
    SendTransactionErrorType | SendCallsErrorType,
    SendTransactionVariables<config, config["chains"][number]["id"]>,
    context
  > & {
    sendTransaction: SendTransactionMutate<config, context>;
    sendTransactionAsync: SendTransactionMutateAsync<config, context>;
  }
>;

export const useSendTransaction = <
  config extends Config = ResolvedRegister["config"],
  context = unknown
>(
  parameters: UseSendTransactionParameters<config, context> = {}
): UseSendTransactionReturnType<config, context> => {
  const { mutation } = parameters;
  const { client } = useGelatoSmartWalletClient();

  const config = useConfig(parameters);

  const mutationOptions = sendTransactionMutationOptions(config, {
    ...parameters,
    client
  });

  const { mutate, mutateAsync, ...result } = useMutation({
    ...mutation,
    ...mutationOptions
  });

  type Return = UseSendTransactionReturnType<config, context>;
  return {
    ...result,
    sendTransaction: mutate as Return["sendTransaction"],
    sendTransactionAsync: mutateAsync as Return["sendTransactionAsync"]
  };
};
