import {
  createGelatoSmartWalletClient,
  type GelatoTaskStatus,
  sponsored
} from "@gelatonetwork/smartwallet";
import { custom, type GelatoSmartAccountExtension } from "@gelatonetwork/smartwallet/accounts";
import "dotenv/config";
import { createPublicClient, createWalletClient, type Hex, http } from "viem";
import { entryPoint07Abi, entryPoint07Address } from "viem/account-abstraction";
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
  // Defining an EIP7702 account using as delegation address "0x00000000383e8cBe298514674Ea60Ee1d1de50ac" (Nexus v1.2.0)
  // Using ERC4337 and entry point v0.7
  const account = await custom<
    typeof entryPoint07Abi,
    "0.7",
    GelatoSmartAccountExtension,
    true
  >({
    authorization: {
      account: owner,
      address: "0x00000000383e8cBe298514674Ea60Ee1d1de50ac", // Nexus v1.2.0
    },
    client: publicClient,
    eip7702: true,
    entryPoint: {
      abi: entryPoint07Abi,
      address: entryPoint07Address,
      version: "0.7",
    },
    owner,
    scw: {
      encoding: ERC4337Encoding.ERC7579,
    },
  });

  console.log("Account address:", account.address);

  const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(),
  });

  const swc = await createGelatoSmartWalletClient(client, {
    apiKey: gelatoApiKey,
  });

  const response = await swc.execute({
    calls: [
      {
        data: "0xd09de08a",
        to: "0xEEeBe2F778AA186e88dCf2FEb8f8231565769C27",
        value: 0n,
      },
    ],
    payment: sponsored(),
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
