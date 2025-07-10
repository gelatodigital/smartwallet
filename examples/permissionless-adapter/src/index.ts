import { WalletEncoding, sponsored } from "@gelatonetwork/smartwallet";
import { gelatoBundlerActions, getUserOperationGasPrice } from "@gelatonetwork/smartwallet/adapter";
import "dotenv/config";
import { createSmartAccountClient } from "permissionless";
import { toSafeSmartAccount } from "permissionless/accounts";
import { http, type Hex, createPublicClient } from "viem";
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
  const account = await toSafeSmartAccount({
    client,
    owners: [owner],
    version: "1.4.1"
  });

  const bundler = createSmartAccountClient({
    account,
    chain: baseSepolia,
    // Important: Chain transport (chain rpc) must be passed here instead of bundler transport
    bundlerTransport: http(),
    userOperation: {
      estimateFeesPerGas: async () => {
        return getUserOperationGasPrice(baseSepolia.id, gelatoApiKey).then(({ fast }) => fast);
      }
    }
  }).extend(
    gelatoBundlerActions({
      payment: sponsored(gelatoApiKey),
      // payment: erc20(paymentToken),
      // payment: native(),
      encoding: WalletEncoding.Safe
    })
  );

  const gasPrice = await bundler.getUserOperationGasPrice().then(({ fast }) => fast);
  console.log("User operation gas price: ", gasPrice);

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
