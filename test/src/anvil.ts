import { createServer } from "prool";
import { anvil } from "prool/instances";
import { blockTime, hardfork, testChainId } from "./constants.js";

const anvilInstance = anvil({
  chainId: testChainId,
  hardfork: hardfork,
  blockTime: blockTime
});

const server = createServer({
  instance: anvilInstance
});

export const startAnvil = async () => {
  // Single server start is not starting up the Anvil instance
  await anvilInstance.start();
  await server.start();
};

export const stopAnvil = async () => {
  await server.stop();
  await anvilInstance.stop();
};

export const rpcUrl = () => "http://127.0.0.1:8545";
