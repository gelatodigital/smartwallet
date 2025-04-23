import { Mega, PaymentFactory } from '@mega/core';
import { http, createWalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

const account = privateKeyToAccount('0x<PRIVATE_KEY>'); // TODO: read from env

const client = createWalletClient({
  account,
  chain: sepolia,
  transport: http(),
});

const mega = new Mega(client, PaymentFactory.sponsored('<SPONSOR_API_KEY>')); // TODO: read from env
//const mega = new Mega(client, PaymentFactory.native);

const hash = await mega.execute([
  {
    to: '0xa8851f5f279eD47a292f09CA2b6D40736a51788E',
    data: '0xd09de08a',
    value: 0n,
  },
]);

console.log(hash);
