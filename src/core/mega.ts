import { Account, Address, Call, Chain, publicActions, PublicActions, WalletClient } from 'viem';
import { encodeExecuteData } from 'viem/experimental/erc7821';
import { DELEGATION_ADDRESSES } from './constants';
import { sponsoredCall } from './relay';
import { Payment } from './payment';
import { abi } from './abi';
import { serializeTypedData } from './eip712';

type WalletClientWithChainAndAccount = WalletClient & { chain: Chain; account: Account };
type MegaClient = WalletClientWithChainAndAccount & PublicActions;

export class Mega {
  client: MegaClient;
  payment: Payment;
  hasDelegated: boolean;
  delegationAddress: Address;

  constructor(client: WalletClientWithChainAndAccount, payment: Payment) {
    this.payment = payment;
    this.hasDelegated = false;
    this.delegationAddress = DELEGATION_ADDRESSES[client.chain.id];

    if (!this.delegationAddress) throw new Error(`Chain not supported: ${client.chain.id}`);

    this.client = client.extend(publicActions) as MegaClient;
  }

  public async execute(calls: Call[]): Promise<string> {
    let authorizationList = undefined;
    if (!this.hasDelegated) {
      const bytecode = await this.client.getCode({
        address: this.client.account.address,
      });

      if (bytecode?.toLowerCase() !== `0xef0100${this.delegationAddress.slice(2).toLowerCase()}`) {
        const authorization = await this.client.signAuthorization({
          account: this.client.account,
          contractAddress: this.delegationAddress,
          executor: this.payment.type === 'native' ? 'self' : undefined,
        });

        authorizationList = [authorization];
      }
    }

    if (this.payment.type === 'erc20') {
      // TODO: request quote from relayer
      // TODO: append erc20 transfer to fee collector to calls
      throw new Error('ERC20 payment not yet supported');
    }

    let opData = undefined;
    if (this.payment.type !== 'native') {
      let nonce = 0n;
      if (!authorizationList) {
        nonce = (await this.client.readContract({
          address: this.client.account.address,
          abi,
          functionName: 'getNonce',
        })) as bigint;

        console.log('nonce', nonce);
      }

      const typedData = serializeTypedData(
        this.client.chain.id,
        this.client.account.address,
        calls,
        nonce,
      );

      // TODO: add support for passkey signers
      opData = await this.client.signTypedData({
        account: this.client.account,
        ...typedData,
      });
    }

    const executeData = encodeExecuteData({
      calls,
      opData,
    });

    let hashOrTaskId: string;

    switch (this.payment.type) {
      case 'native': {
        hashOrTaskId = await this.client.sendTransaction({
          account: this.client.account,
          to: this.client.account.address,
          chain: this.client.chain,
          authorizationList,
          data: executeData,
        });
        break;
      }
      case 'sponsored': {
        hashOrTaskId = await sponsoredCall({
          chainId: this.client.chain.id,
          target: this.client.account.address,
          data: executeData,
          sponsorApiKey: this.payment.apiKey,
          authorizationList,
        });
        break;
      }
      // TODO: 'erc20'
    }

    this.hasDelegated = true;

    return hashOrTaskId;
  }
}
