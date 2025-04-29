import "dotenv/config";
import { createGelatoSmartWalletClient, native } from "@gelatodigital/smartwallet";
import { http, type Hex, createWalletClient } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const privateKey = (process.env.PRIVATE_KEY ?? generatePrivateKey()) as Hex;
const account = privateKeyToAccount(privateKey);

const client = createWalletClient({
  account,
  chain: sepolia,
  transport: http()
});

createGelatoSmartWalletClient(client)
  .execute({
    payment: native(),
    calls: [
      {
        to: "0xa8851f5f279eD47a292f09CA2b6D40736a51788E",
        data: "0xd09de08a",
        value: 0n
      }
    ]
  })
  .then((id) => {
    console.log(`Your Gelato id is: ${id}`);
  });
