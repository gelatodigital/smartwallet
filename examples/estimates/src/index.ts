import { createGelatoSmartWalletClient, sponsored } from "@gelatonetwork/smartwallet";
import { gelato } from "@gelatonetwork/smartwallet/accounts";
import { http, type Hex, createPublicClient, createWalletClient, formatEther } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const sponsorApiKey = process.env.SPONSOR_API_KEY;

if (!sponsorApiKey) {
  throw new Error("SPONSOR_API_KEY is not set");
}

const privateKey = (process.env.PRIVATE_KEY ?? generatePrivateKey()) as Hex;
const owner = privateKeyToAccount(privateKey);

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http()
});

(async () => {
  const account = await gelato({
    owner,
    client: publicClient
  });

  const client = createWalletClient({
    account,
    chain: sepolia,
    transport: http()
  });

  const swc = await createGelatoSmartWalletClient(client, { apiKey: sponsorApiKey });

  const response = await swc.estimate({
    payment: sponsored(sponsorApiKey),
    calls: [
      {
        to: "0xa8851f5f279eD47a292f09CA2b6D40736a51788E",
        data: "0xd09de08a",
        value: 0n
      }
    ]
  });

  console.log(`Estimated fee: ${formatEther(BigInt(response.fee.estimatedFee))} ETH`);
  console.log(`Estimated gas: ${response.gas} GAS`);
  process.exit(0);
})();
