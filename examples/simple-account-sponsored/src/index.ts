import {
  type GelatoTaskStatus,
  createGelatoSmartWalletClient,
  sponsored
} from "@gelatonetwork/smartwallet";
import { type GelatoSmartAccountExtension, custom } from "@gelatonetwork/smartwallet/accounts";
import "dotenv/config";
import { http, type Hex, createPublicClient, createWalletClient } from "viem";
import { entryPoint08Abi, entryPoint08Address } from "viem/account-abstraction";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { ERC4337Encoding } from "../../../src/_dist/wallet";

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
  const account = await custom<typeof entryPoint08Abi, "0.8", GelatoSmartAccountExtension, true>({
    owner,
    client: publicClient,
    authorization: {
      account: owner,
      address: "0xe6Cae83BdE06E4c305530e199D7217f42808555B"
    },
    entryPoint: {
      abi: entryPoint08Abi,
      address: entryPoint08Address,
      version: "0.8"
    },
    scw: {
      encoding: ERC4337Encoding.SimpleAccount
    },
    eip7702: true
  });

  console.log("Account address:", account.address);

  const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http()
  });

  const swc = await createGelatoSmartWalletClient(client, {
    apiKey: gelatoApiKey
  });

  const response = await swc.execute({
    payment: sponsored(gelatoApiKey),
    calls: [
      {
        to: "0xEEeBe2F778AA186e88dCf2FEb8f8231565769C27",
        data: "0xd09de08a",
        value: 0n
      }
    ]
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
