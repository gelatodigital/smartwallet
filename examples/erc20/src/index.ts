import {
  createGelatoSmartWalletClient,
  erc20,
  type GelatoTaskStatus
} from "@gelatonetwork/smartwallet";
import { gelato } from "@gelatonetwork/smartwallet/accounts";
import "dotenv/config";
import { createPublicClient, createWalletClient, type Hex, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const privateKey = process.env.PRIVATE_KEY as Hex;
const apiKey = process.env.GELATO_API_KEY;

if (!privateKey) {
  throw new Error("PRIVATE_KEY is not set");
}

// USDC on Base Sepolia
const token = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const owner = privateKeyToAccount(privateKey);

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http()
});

(async () => {
  const account = await gelato({
    client: publicClient,
    owner
  });

  const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http()
  });

  const swc = await createGelatoSmartWalletClient(client, { apiKey });

  const response = await swc.execute({
    calls: [
      {
        data: "0xd09de08a",
        to: "0xEEeBe2F778AA186e88dCf2FEb8f8231565769C27",
        value: 0n
      }
    ],
    payment: erc20(token)
  });

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
})();
