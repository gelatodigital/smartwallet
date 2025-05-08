import "dotenv/config";
import { createGelatoSmartWalletClient, sponsored } from "@gelatonetwork/smartwallet";
import { http, type Hex, createWalletClient, formatEther } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const sponsorApiKey = process.env.SPONSOR_API_KEY;

if (!sponsorApiKey) {
  throw new Error("SPONSOR_API_KEY is not set");
}

const privateKey = (process.env.PRIVATE_KEY ?? generatePrivateKey()) as Hex;
const account = privateKeyToAccount(privateKey);

const client = createWalletClient({
  account,
  chain: sepolia,
  transport: http()
});

createGelatoSmartWalletClient(client, { apiKey: sponsorApiKey })
  .estimate({
    payment: sponsored(sponsorApiKey),
    calls: [
      {
        to: "0xa8851f5f279eD47a292f09CA2b6D40736a51788E",
        data: "0xd09de08a",
        value: 0n
      }
    ]
  })
  .then(async ({ estimatedFee, estimatedGas }) => {
    console.log(`Estimated fee: ${formatEther(estimatedFee)} ETH`);
    console.log(`Estimated gas: ${estimatedGas} GAS`);
    process.exit(0);
  });
