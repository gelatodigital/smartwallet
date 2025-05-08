import { parseAbi } from "viem";

export const erc20MintableAbi = parseAbi(["function mint(address account, uint256 amount)"]);
