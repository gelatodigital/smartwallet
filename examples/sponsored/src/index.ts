import { createMegaClient, sponsored } from "@gelatomega/core";
import { http, createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const account = privateKeyToAccount("0x<PRIVATE_KEY>"); // TODO: read from env

const client = createWalletClient({
  account,
  chain: sepolia,
  transport: http()
});

(async () => {
  const mega = createMegaClient(client); // TODO: read from env
  const hash = await mega.execute({
    payment: sponsored("<SPONSOR_API_KEY>"),
    calls: [{ to: "0xa8851f5f279eD47a292f09CA2b6D40736a51788E", data: "0xd09de08a", value: 0n }]
  });

  console.log(hash);
})();
