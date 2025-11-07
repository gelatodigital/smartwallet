import {
  createGelatoSmartWalletClient,
  type GelatoTaskStatus,
  sponsored
} from "@gelatonetwork/smartwallet";
import { gelato } from "@gelatonetwork/smartwallet/accounts";
import "dotenv/config";
import { createPublicClient, createWalletClient, type Hex, http } from "viem";
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

(async () => {
  const account = await gelato({
    client: publicClient,
    owner
  });

  console.log("Account address:", account.address);

  const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http()
  });

  const swc = await createGelatoSmartWalletClient(client, { apiKey: gelatoApiKey });

  console.log("Preparing transaction...");
  const startPrepare = performance.now();

  const preparedCalls = await swc.prepareCalls({
    calls: [
      {
        data: "0xd09de08a",
        to: "0xEEeBe2F778AA186e88dCf2FEb8f8231565769C27",
        value: 0n
      }
    ],
    payment: sponsored()
  });

  const endPrepare = performance.now();
  console.log(`Took ${(endPrepare - startPrepare).toFixed(2)}ms to prepare your request.`);

  console.log("Sending transaction...");
  const startSend = performance.now();
  const startTimestamp = Date.now();

  const response = await swc.sendPreparedCalls({
    preparedCalls
  });

  const endSend = performance.now();
  console.log(
    `Took ${(endSend - startSend).toFixed(2)}ms to send your request. Your Gelato id is: ${response.id}`
  );

  // Listen for events
  response.on("submitted", (status: GelatoTaskStatus) => {
    const end = performance.now();
    console.log(`Transaction submitted: ${status.transactionHash}`);
    console.log(`Time from sending to onchain submission: ${(end - startSend).toFixed(2)}ms`);
  });

  response.on("success", async (status: GelatoTaskStatus) => {
    console.log(`Transaction successful: ${status.transactionHash}`);
    const blockTimestamp = await publicClient
      .waitForTransactionReceipt({ hash: status.transactionHash as `0x${string}` })
      .then(({ blockHash }) => publicClient.getBlock({ blockHash: blockHash }))
      .then((block) => Number(block.timestamp) * 1000);
    const latency = blockTimestamp - startTimestamp;
    console.log(`Latency to get transaction included: ${latency}ms`);
    process.exit(0);
  });

  response.on("error", (error: Error) => {
    const end = performance.now();
    console.error(`Transaction failed: ${error.message}`);
    console.log(`Time from sending to error: ${(end - startSend).toFixed(2)}ms`);
    process.exit(1);
  });
})();
