import "dotenv/config";
import {
  type GelatoTaskStatus,
  createGelatoSmartWalletClient,
  sponsored
} from "@gelatonetwork/smartwallet";
import { custom } from "@gelatonetwork/smartwallet/accounts";
import { http, type Hex, createPublicClient, createWalletClient } from "viem";
import { entryPoint08Abi, entryPoint08Address } from "viem/account-abstraction";
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
  // Defining an EIP7702 account using as delegation address "0x11923b4c785d87bb34da4d4e34e9feea09179289"
  // Using ERC4337 and entry point v0.8
  const account = await custom<typeof entryPoint08Abi, "0.8", true>({
    owner,
    client: publicClient,
    authorization: {
      account: owner,
      address: "0x11923b4c785d87bb34da4d4e34e9feea09179289"
    },
    entryPoint: {
      abi: entryPoint08Abi,
      address: entryPoint08Address,
      version: "0.8"
    },
    scw: {
      encoding: "erc7821"
    },
    eip7702: true
  });

  console.log("Account address:", account.address);

  const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http()
  });

  createGelatoSmartWalletClient(client, { apiKey: sponsorApiKey })
    .execute({
      payment: sponsored(sponsorApiKey),
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
