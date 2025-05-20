import {
  type GelatoTaskStatus,
  createGelatoSmartWalletClient,
  sponsored,
  toKernelSmartAccount
} from "@gelatonetwork/smartwallet";
import { http, type Hex, createPublicClient, createWalletClient } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { baseSepolia, sepolia } from "viem/chains";

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
  const account = await toKernelSmartAccount({
    owner,
    client: publicClient
  });

  console.log("Account address:", account.address);

  const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http()
  });

  createGelatoSmartWalletClient(client, { apiKey: sponsorApiKey, wallet: "kernel" })
    .execute({
      payment: sponsored(),
      calls: [
        {
          to: "0xa8851f5f279eD47a292f09CA2b6D40736a51788E",
          data: "0xd09de08a",
          value: 0n
        }
      ]
    })
    .then((response) => {
      console.log(`Your Gelato id is: ${response.id}`);
      console.log("Waiting for transaction to be confirmed...");

      // Listen for events
      response.on("success", (status: GelatoTaskStatus) => {
        console.log(`Transaction successful: ${status.transactionHash}`);
        process.exit(0);
      });
      response.on("error", (error: Error) => {
        console.error(`Transaction failed: ${error.message}`);
        process.exit(1);
      });
    });
})();
