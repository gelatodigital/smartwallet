import { WalletEncoding, sponsored } from "@gelatonetwork/smartwallet";
import { gelatoBundlerActions } from "@gelatonetwork/smartwallet/adapter";
import "dotenv/config";
import { createSmartAccountClient } from "permissionless";
import { toLightSmartAccount } from "permissionless/accounts";
import { http, type Hex, createPublicClient } from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const gelatoApiKey = process.env.GELATO_API_KEY;

if (!gelatoApiKey) {
  throw new Error("GELATO_API_KEY is not set");
}

const privateKey = (process.env.PRIVATE_KEY ?? generatePrivateKey()) as Hex;
const owner = privateKeyToAccount(privateKey);

const client = createPublicClient({
  chain: baseSepolia,
  transport: http()
});

(async () => {
  // You can use any permissionless adapter here
  const account = await toLightSmartAccount({
    client,
    owner,
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7"
    },
    version: "2.0.0"
  });

  const bundler = createSmartAccountClient({
    account,
    chain: baseSepolia,
    // Important: Chain transport (chain rpc) must be passed here instead of bundler transport
    bundlerTransport: http()
  }).extend(
    gelatoBundlerActions({
      payment: sponsored(),
      // payment: erc20(paymentToken),
      // payment: native(),
      encoding: WalletEncoding.LightAccount
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
