import { SignedAuthorizationList } from 'viem';
import { GELATO_API } from './constants';

export interface SponsoredCallRequest {
  chainId: number;
  target: string;
  data: string;
  sponsorApiKey: string;
  gasLimit?: string;
  retries?: number;
  authorizationList?: SignedAuthorizationList;
}

export const sponsoredCall = async (request: SponsoredCallRequest): Promise<string> => {
  if (request.authorizationList && request.authorizationList.length > 0)
    delete request.authorizationList[0].v;

  const { taskId, message } = await fetch(`${GELATO_API}/relays/v2/sponsored-call-eip7702`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  }).then((raw) => raw.json());

  if (message) throw new Error(message);

  return taskId;
};
