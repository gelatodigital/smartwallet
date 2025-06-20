import { createGelatoSmartWalletClient, sponsored } from "@gelatonetwork/smartwallet";
import { gelato } from "@gelatonetwork/smartwallet/accounts";
import "dotenv/config";
import { http, type Hex, createPublicClient, createWalletClient, formatEther } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const sponsorApiKey = process.env.SPONSOR_API_KEY;

if (!sponsorApiKey) {
  throw new Error("SPONSOR_API_KEY is not set");
}

const privateKey = (process.env.PRIVATE_KEY ?? generatePrivateKey()) as Hex;
const owner = privateKeyToAccount(privateKey);

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http()
});

(async () => {
  const account = await gelato({
    owner,
    client: publicClient
  });

  const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http()
  });

  const swc = await createGelatoSmartWalletClient(client, {
    apiKey: sponsorApiKey
  });

  const response = await swc.estimate({
    payment: sponsored(sponsorApiKey),
    calls: [
      {
        to: "0xEEeBe2F778AA186e88dCf2FEb8f8231565769C27",
        data: "0xd09de08a",
        value: 0n
      }
    ]
  });

  console.log(`Estimated fee: ${formatEther(BigInt(response.fee.amount))} ETH`);
  console.log(`Estimated gas: ${response.gas} GAS`);
  process.exit(0);
})();
