import { WalletEncoding, sponsored } from "@gelatonetwork/smartwallet";
import { kernel } from "@gelatonetwork/smartwallet/accounts";
import { gelatoBundlerActions } from "@gelatonetwork/smartwallet/adapter";
import "dotenv/config";
import { http, type Hex, createPublicClient } from "viem";
import { createBundlerClient, toCoinbaseSmartAccount } from "viem/account-abstraction";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const sponsorApiKey = process.env.SPONSOR_API_KEY;

if (!sponsorApiKey) {
  throw new Error("SPONSOR_API_KEY is not set");
}

const privateKey = (process.env.PRIVATE_KEY ?? generatePrivateKey()) as Hex;
const owner = privateKeyToAccount(privateKey);

const client = createPublicClient({
  chain: baseSepolia,
  transport: http()
});

(async () => {
  // You can also use any permissionless adapter here
  const account = await kernel({
    owner,
    client,
    eip7702: true
  });

  // You can also use permissionless `createSmartAccountClient` instead of viem
  const bundler = createBundlerClient({
    account,
    client,
    // Important: Chain transport (chain rpc) must be passed here instead of bundler transport
    transport: http()
  }).extend(
    gelatoBundlerActions({
      payment: sponsored(sponsorApiKey),
      encoding: WalletEncoding.ERC7579
    })
  );

  const taskId = await bundler.sendUserOperation({
    calls: [
      {
        to: "0xEEeBe2F778AA186e88dCf2FEb8f8231565769C27",
        data: "0xd09de08a",
        value: 0n
      }
    ]
  });

  console.log(`Your Gelato id is: ${taskId}`);
  console.log("Waiting for transaction to be confirmed...");

  const receipt = await bundler.waitForUserOperationReceipt({ hash: taskId });
  console.log(`Transaction successful: ${receipt.receipt.transactionHash}`);

  process.exit(0);
})();
