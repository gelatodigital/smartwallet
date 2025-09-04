import {
  createGelatoSmartWalletClient,
  type GelatoTaskStatus,
  sponsored
} from "@gelatonetwork/smartwallet";
import { custom, type GelatoSmartAccountExtension } from "@gelatonetwork/smartwallet/accounts";
import "dotenv/config";
import { createPublicClient, createWalletClient, type Hex, http } from "viem";
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
    authorization: {
      account: owner,
      // the delegation is only officially deployed on Mainnet
      // we've also deployed it on Base Sepolia and Sepolia
      // - mainnet: 0xcc0c946EecF01A4Bc76Bc333Ea74CEb04756f17b
      // - sepolia: 0xB13dEe0EFFBdDd11C300dfcF4e847e22e2E300e4
      // - base sepolia: 0xA65Ce868f4d417284d5a15a24963BB089A9665E9
      address: "0xA65Ce868f4d417284d5a15a24963BB089A9665E9"
    },
    client: publicClient,
    eip7702: true,
    entryPoint: {
      abi: entryPoint08Abi,
      address: entryPoint08Address,
      version: "0.8"
    },
    owner,
    scw: {
      encoding: ERC4337Encoding.TokenPocket
    }
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
    calls: [
      {
        data: "0xd09de08a",
        to: "0xEEeBe2F778AA186e88dCf2FEb8f8231565769C27",
        value: 0n
      }
    ],
    payment: sponsored(gelatoApiKey)
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
