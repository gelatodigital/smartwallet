import { createGelatoSmartWalletClient, sponsored } from "@gelatonetwork/smartwallet";
import { Validator, addSession, gelato, removeSession } from "@gelatonetwork/smartwallet/accounts";
import "dotenv/config";
import { http, type Address, type Hex, createPublicClient, createWalletClient } from "viem";
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

// This uses the accounts owner to create a session given the desired signer and expiry
const createSession = async (signer: Address, expiry: number) => {
  const account = await gelato({
    owner,
    client: publicClient
  });

  console.log("Account address:", account.address);

  const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http()
  });

  const swc = await createGelatoSmartWalletClient(client, {
    apiKey: sponsorApiKey
  });

  const response = await swc.execute({
    payment: sponsored(sponsorApiKey),
    calls: [
      // This call creates the session
      // You can execute other calls before or after this
      ...addSession(signer, expiry)
    ]
  });

  const hash = await response.wait();
  console.log(`Session created! hash: ${hash}`);
};

const main = async () => {
  // This will be the signer for the session
  const signer = privateKeyToAccount(generatePrivateKey());
  const expiry = Math.round(Date.now() / 1000) + 5 * 60; // 5 minutes

  // The owner will create the session
  // Once this session is created, it itself can be used to create other sessions
  await createSession(signer.address, expiry);

  console.log("Waiting 5 seconds...");
  await new Promise((r) => setTimeout(r, 5000));

  const account = await gelato({
    signer,
    address: owner.address,
    validator: Validator.Session,
    client: publicClient
  });

  console.log("Signer address:", signer.address);

  const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http()
  });

  const swc = await createGelatoSmartWalletClient(client, {
    apiKey: sponsorApiKey
  });

  const response = await swc.execute({
    payment: sponsored(sponsorApiKey),
    calls: [
      {
        to: "0xEEeBe2F778AA186e88dCf2FEb8f8231565769C27",
        data: "0xd09de08a",
        value: 0n
      },
      // This removes the session right in the same transaction
      // The order of this doesn't matter, it could also come first
      removeSession(signer.address)
    ]
  });

  const hash = await response.wait();
  console.log(`Call executed and session voided! hash: ${hash}`);
};

main();
