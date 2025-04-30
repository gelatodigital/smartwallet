import "dotenv/config";
import {
  type GelatoTaskStatus,
  createGelatoSmartWalletClient,
  erc20
} from "@gelatodigital/smartwallet";
import { http, type Hex, createWalletClient } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const token = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";
const privateKey = (process.env.PRIVATE_KEY ?? generatePrivateKey()) as Hex;
const account = privateKeyToAccount(privateKey);

const client = createWalletClient({
  account,
  chain: sepolia,
  transport: http()
});

createGelatoSmartWalletClient(client)
  .execute({
    payment: erc20(token),
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
