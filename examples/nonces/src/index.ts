import { createGelatoSmartWalletClient, sponsored } from "@gelatonetwork/smartwallet";
import { gelato } from "@gelatonetwork/smartwallet/accounts";
import "dotenv/config";
import { http, type Call, type Hex, createPublicClient, createWalletClient } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const gelatoApiKey = process.env.GELATO_API_KEY;

if (!gelatoApiKey) {
  throw new Error("GELATO_API_KEY is not set");
}

const privateKey = (process.env.PRIVATE_KEY ?? generatePrivateKey()) as Hex;
const owner = privateKeyToAccount(privateKey);

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http()
});

const main = async () => {
  const account = await gelato({
    owner,
    client: publicClient
  });

  console.log("Account address:", account.address);

  const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http()
  });

  const swc = await createGelatoSmartWalletClient(client, {
    apiKey: gelatoApiKey
  });

  const calls: Call[] = [
    {
      to: "0xEEeBe2F778AA186e88dCf2FEb8f8231565769C27",
      data: "0xd09de08a",
      value: 0n
    }
  ];

  // Regular `execute` call key without `nonce` or `nonceKey` specified.
  // This defaults to `nonceKey` zero.
  const response1 = await swc.execute({
    payment: sponsored(gelatoApiKey),
    calls
  });

  const hash1 = await response1.wait();
  console.log(`Transaction successful, hash: ${hash1}`);

  console.log("Waiting 2 seconds...");
  await new Promise((r) => setTimeout(r, 2000));

  // Same call with `nonceKey` specified (2-dimensional nonces).
  // To execute transactions in parallel, a different `nonceKey` can be specified for each call.
  const responses2 = await Promise.all([
    swc.execute({
      payment: sponsored(gelatoApiKey),
      calls,
      nonceKey: 10n
    }),
    swc.execute({
      payment: sponsored(gelatoApiKey),
      calls,
      nonceKey: 20n
    })
  ]);

  const hashes2 = await Promise.all(responses2.map((x) => x.wait()));
  console.log(`Transaction successful, hashes: ${hashes2}`);

  console.log("Waiting 2 seconds...");
  await new Promise((r) => setTimeout(r, 2000));

  // Same call with sequential `nonce` specified.
  // This allows you to submit multiple transaction with the same `nonceKey` at once by explicitly specifying the ordering (nonce).
  const nonce = await swc.account.getNonce();

  const responses3 = await Promise.all([
    swc.execute({
      payment: sponsored(gelatoApiKey),
      calls,
      nonce
    }),
    swc.execute({
      payment: sponsored(gelatoApiKey),
      calls,
      nonce: nonce + 1n // this transaction will execute after the first one
    })
  ]);

  const hashes3 = await Promise.all(responses3.map((x) => x.wait()));
  console.log(`Transaction successful, hashes: ${hashes3}`);

  process.exit(0);
};

main();
