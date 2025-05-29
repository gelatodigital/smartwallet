import {
  type GelatoTaskStatus,
  createGelatoSmartWalletClient,
  kernel,
  sponsored
} from "@gelatonetwork/smartwallet";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { createKernelAccount } from "@zerodev/sdk";
import { KERNEL_V3_3, getEntryPoint } from "@zerodev/sdk/constants";
import "dotenv/config";
import { http, type Hex, createWalletClient } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

async function main() {
  const sponsorApiKey = process.env.SPONSOR_API_KEY;

  if (!sponsorApiKey) {
    throw new Error("SPONSOR_API_KEY is not set");
  }

  const privateKey = (process.env.PRIVATE_KEY ?? generatePrivateKey()) as Hex;
  const account = privateKeyToAccount(privateKey);

  const client = createWalletClient({
    account,
    chain: sepolia,
    transport: http()
  });

  const ecdsaValidator = await signerToEcdsaValidator(client, {
    signer: account,
    entryPoint: getEntryPoint("0.7"),
    kernelVersion: KERNEL_V3_3
  });

  const kernelAccount = await createKernelAccount(client, {
    plugins: {
      sudo: ecdsaValidator
    },
    entryPoint: getEntryPoint("0.7"),
    kernelVersion: KERNEL_V3_3
  });

  const { factory, factoryData } = await kernelAccount.getFactoryArgs();
  console.log("factory", factory);
  console.log("factoryData", factoryData);
  console.log("address: ", kernelAccount.address);

  const smartWalletClient = createGelatoSmartWalletClient(client, {
    apiKey: sponsorApiKey,
    wallet: kernel({
      eip7702: false,
      address: kernelAccount.address,
      factory: {
        address: factory,
        data: factoryData
      }
    })
  });

  try {
    const response = await smartWalletClient.execute({
      payment: sponsored(sponsorApiKey),
      calls: [
        {
          to: "0xa8851f5f279eD47a292f09CA2b6D40736a51788E",
          data: "0xd09de08a",
          value: 0n
        }
      ]
    });

    console.log(`Your Gelato id is: ${response.id}`);
    console.log("Waiting for transaction to be confirmed...");

    await new Promise<void>((resolve, reject) => {
      response.on("success", (status: GelatoTaskStatus) => {
        console.log(`Transaction successful: ${status.transactionHash}`);
        resolve();
      });

      response.on("error", (error: Error) => {
        console.error(`Transaction failed: ${error.message}`);
        reject(error);
      });
    });
  } catch (error) {
    console.error("Error executing transaction:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
