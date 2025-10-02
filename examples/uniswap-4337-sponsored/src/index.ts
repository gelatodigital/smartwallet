import { uniswap } from "@gelatonetwork/smartwallet/accounts";
import "dotenv/config";
import { createPublicClient, createWalletClient, type Hex, http } from "viem";
import { createBundlerClient } from "viem/account-abstraction";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const gelatoApiKey = process.env.GELATO_API_KEY;

if (!gelatoApiKey) {
  throw new Error("GELATO_API_KEY is not set");
}

const privateKey = (process.env.PRIVATE_KEY ?? generatePrivateKey()) as Hex;
const owner = privateKeyToAccount(privateKey);
const client = createPublicClient({
  chain: sepolia,
  transport: http()
});

const walletClient = createWalletClient({
  account: owner,
  chain: sepolia,
  transport: http()
});

(async () => {
  const authorization = await walletClient.signAuthorization({
    account: owner,
    contractAddress: "0x000000009B1D0aF20D8C6d0A44e162d11F9b8f00", // uniswap callibur account address
    nonce: 0
  });

  const account = await uniswap({
    client,
    owner
  });

  const bundler = createBundlerClient({
    account,
    client,
    transport: http(
      `https://api.gelato.digital/bundlers/${sepolia.id}/rpc?apiKey=${gelatoApiKey}&sponsored=true`
    )
  });

  const userOpHash = await bundler.sendUserOperation({
    authorization, // if account is already deployed, then you don't need to pass authorization
    calls: [
      {
        data: "0xd09de08a",
        to: "0xEEeBe2F778AA186e88dCf2FEb8f8231565769C27",
        value: 0n
      }
    ],
    maxFeePerGas: BigInt(0),
    maxPriorityFeePerGas: BigInt(0)
  });

  console.log(`Your user operation hash is: ${userOpHash}`);
  console.log("Waiting for transaction to be confirmed...");

  const receipt = await bundler.waitForUserOperationReceipt({
    hash: userOpHash
  });
  console.log(`Transaction successful: ${receipt.receipt.transactionHash}`);
  process.exit(0);
})();
