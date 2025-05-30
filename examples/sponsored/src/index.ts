import "dotenv/config";
import {
  type GelatoTaskStatus,
  createGelatoSmartWalletClient,
  sponsored
} from "@gelatonetwork/smartwallet";
import { gelato } from "@gelatonetwork/smartwallet/accounts";
import { http, type Hex, createPublicClient, createWalletClient } from "viem";
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

  console.log("Account address:", account.address);

  const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http()
  });

  const swc = await createGelatoSmartWalletClient(client, { apiKey: sponsorApiKey });

  console.log("Preparing transaction...");
  const preparedCalls = await swc.prepare({
    payment: sponsored(sponsorApiKey),
    calls: [
      {
        to: "0xa8851f5f279eD47a292f09CA2b6D40736a51788E",
        data: "0xd09de08a",
        value: 0n
      }
    ]
  });

  console.log("Sending transaction...");

  const start = performance.now();
  const response = await swc.send({
    preparedCalls
  });
  const end = performance.now();
  console.log(`Time to send: ${(end - start).toFixed(2)}ms`);
  console.log(`Your Gelato id is: ${response.id}`);

  // Listen for events
  response.on("submitted", (status: GelatoTaskStatus) => {
    const end = performance.now();
    console.log(`Transaction submitted: ${status.transactionHash}`);
    console.log(`Time from sending to submission: ${(end - start).toFixed(2)}ms`);
  });
  response.on("success", (status: GelatoTaskStatus) => {
    const end = performance.now();
    console.log(`Transaction successful: ${status.transactionHash}`);
    console.log(`Time from sending to success: ${(end - start).toFixed(2)}ms`);
    process.exit(0);
  });
  response.on("error", (error: Error) => {
    const end = performance.now();
    console.error(`Transaction failed: ${error.message}`);
    console.log(`Time from sending to error: ${(end - start).toFixed(2)}ms`);
    process.exit(1);
  });
})();
