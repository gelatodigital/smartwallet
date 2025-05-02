import { blockTime } from "./constants.js";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export const waitBlockTime = (numberBlocks = 1) => wait(blockTime * numberBlocks * 1000);
