import type { Account, PublicClient } from "viem";
import type { CustomSmartAccountParameters } from "../accounts/custom/index.js";
import {
  type GelatoSmartAccount,
  type GelatoSmartAccountSCW,
  custom,
  gelato,
  kernel,
  safe
} from "../accounts/index.js";

export const lowercase = (str: string) => str.toLowerCase();

export const isGelatoSmartAccount = (account: Account): account is GelatoSmartAccount => {
  return "scw" in account;
};

export const transformIntoGelatoSmartAccount = async (
  client: PublicClient,
  params?: { scw?: GelatoSmartAccountSCW & Partial<Omit<CustomSmartAccountParameters, "scw">> }
): Promise<GelatoSmartAccount> => {
  if (!client.account) {
    throw new Error("Account is not set");
  }

  if (isGelatoSmartAccount(client.account)) {
    return client.account;
  }

  if (!params || !("scw" in params)) {
    throw new Error("Field `scw` is required to transform to Gelato Smart Account");
  }

  if (params.scw?.type === "gelato") {
    return gelato({
      ...params.scw,
      client,
      owner: client.account
    });
  }

  if (params.scw?.type === "kernel") {
    return kernel({
      ...params.scw,
      client,
      owner: client.account,
    });
  }

  if (params.scw?.type === "safe") {
    return safe({
      client,
      owners: [client.account],
      version: "1.4.1"
    });
  }

  if (params.scw?.type === "custom") {
    return custom({
      client,
      owner: client.account,
      ...params.scw,
      eip7702: params.scw.eip7702 ?? true,
      scw: {
        encoding: params.scw.encoding ?? "erc7821"
      },
    });
  }

  throw new Error("Could not transform into Gelato Smart Account!");
};
