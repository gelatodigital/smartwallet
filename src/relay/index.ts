import type { Hash, SignedAuthorizationList } from "viem";

import { GelatoResponse } from "./response.js";
import { WebsocketHandler } from "./status/index.js";
import { api, apiWs } from "../constants/index.js";

interface BaseCallRequest {
  chainId: number;
  target: string;
  data: string;
  gasLimit?: string;
  retries?: number;
  authorizationList?: SignedAuthorizationList;
}

export interface SponsoredCallRequest extends BaseCallRequest {
  sponsorApiKey: string;
}

export interface CallGelatoAccountRequest extends BaseCallRequest {
  feeToken: string;
}

const callGelatoApi = async <T extends object>(
  endpoint: string,
  request: T
): Promise<GelatoResponse> => {
  if ("authorizationList" in request && Array.isArray(request.authorizationList)) {
    if (request.authorizationList.length > 0) {
      delete request.authorizationList[0].v;
    } else {
      delete request.authorizationList;
    }
  }

  const { taskId, message } = await fetch(`${api()}${endpoint}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(request)
  }).then((raw) => raw.json());

  if (message) throw new Error(message);

  return new GelatoResponse(taskId);
};

export const sponsoredCall = (request: SponsoredCallRequest): Promise<GelatoResponse> =>
  callGelatoApi("/relays/v2/sponsored-call-eip7702", request);

export const callGelatoAccount = (request: CallGelatoAccountRequest): Promise<GelatoResponse> =>
  callGelatoApi("/relays/v2/call-gelato-account", request);
