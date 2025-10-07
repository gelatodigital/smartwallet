import { createGelatoSmartWalletClient } from "@gelatonetwork/smartwallet";
import { gelato } from "@gelatonetwork/smartwallet/accounts";
import "dotenv/config";
import { createPublicClient, createWalletClient, type Hex, http } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

const gelatoApiKey = process.env.GELATO_API_KEY;

if (!gelatoApiKey) {
  throw new Error("GELATO_API_KEY is not set");
}

const privateKey = (process.env.PRIVATE_KEY ?? generatePrivateKey()) as Hex;
const owner = privateKeyToAccount(privateKey);

const publicClient = createPublicClient({
  chain: base,
  transport: http()
});

function encodeNonce(key: bigint, seq: bigint): bigint {
  // key: up to 192 bits
  // seq: up to 64 bits
  return (key << 64n) | seq;
}

(async () => {
  const account = await gelato({
    client: publicClient,
    owner
  });

  console.log("Account address:", account.address);

  const client = createWalletClient({
    account,
    chain: base,
    transport: http()
  });

  const swc = await createGelatoSmartWalletClient(client, { apiKey: gelatoApiKey });

  const attempt1Signed = await swc.signCalls({
    calls: [
      {
        data: "0xd09de08a",
        to: "0xEEeBe2F778AA186e88dCf2FEb8f8231565769C27",
        value: 0n
      }
    ],
    nonce: encodeNonce(BigInt(Date.now()), 0n)
  });

  console.log("Sending sponsored transaction for first time...");
  let before = Date.now();
  const attempt1 = await swc.sendSponsoredTransaction({
    authorizationList: attempt1Signed.authorizationList,
    data: attempt1Signed.data
  });
  console.log(`[Attempt 1] Gelato id: ${attempt1.id}`);

  let sent = Date.now();
  const attempt1Included = await attempt1.wait();
  let included = Date.now();
  console.log(`[Attempt 1] Transaction included: ${attempt1Included}`);
  console.log(
    `[Attempt 1] Time before sending to onchain inclusion: ${(included - before).toFixed(2)}ms`
  );
  console.log(
    `[Attempt 1] Time after sending to onchain inclusion: ${(included - sent).toFixed(2)}ms`
  );

  console.log("Waiting 5 seconds...");
  await new Promise((resolve) => setTimeout(resolve, 5000));

  /* ------------------------------------------------------------------------------------------------- */

  const attempt2Signed = await swc.signCalls({
    calls: [
      {
        data: "0xd09de08a",
        to: "0xEEeBe2F778AA186e88dCf2FEb8f8231565769C27",
        value: 0n
      }
    ],
    nonce: encodeNonce(BigInt(Date.now()), 0n)
  });

  console.log("Sending sponsored transaction for second time...");
  before = Date.now();
  const attempt2 = await swc.sendSponsoredTransaction({
    authorizationList: attempt2Signed.authorizationList,
    data: attempt2Signed.data
  });
  console.log(`[Attempt 2] Gelato id: ${attempt2.id}`);

  sent = Date.now();
  const attempt2Included = await attempt2.wait();
  included = Date.now();
  console.log(`[Attempt 2] Transaction included: ${attempt2Included}`);
  console.log(
    `[Attempt 2] Time before sending to onchain inclusion: ${(included - before).toFixed(2)}ms`
  );
  console.log(
    `[Attempt 2] Time after sending to onchain inclusion: ${(included - sent).toFixed(2)}ms`
  );
  process.exit(0);
})();
