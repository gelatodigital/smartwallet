import type { Address, Hex } from "viem";
import { deployContract, getCode, getTransactionReceipt, setCode } from "viem/actions";

import { testClient } from "./account.js";
import { waitBlockTime } from "./utils.js";

import Delegation from "../../contracts/out/Delegation.sol/Delegation.json";
import SimpleERC20 from "../contract/SimpleERC20.json";
import { multicall3Address, multicall3Bytecode } from "./constants.js";

export async function deployContracts(parameters: {
  delegation: Address;
  erc20: Address;
}) {
  const { delegation, erc20 } = parameters;

  const client = testClient;

  // Deploy Delegation
  {
    const hash = await deployContract(client, {
      abi: Delegation.abi,
      bytecode: Delegation.bytecode.object as Hex,
      chain: null
    });

    await waitBlockTime();

    const { contractAddress } = await getTransactionReceipt(client, {
      hash
    });

    if (!contractAddress) {
      throw new Error("Delegation contract deployment failed");
    }

    const code = await getCode(client, {
      address: contractAddress
    });

    if (!code) {
      throw new Error("Delegation contract code not found");
    }

    await setCode(client, {
      address: delegation,
      bytecode: code
    });

    await waitBlockTime();
  }

  // Deploy SimpleERC20 token with unlimited minting
  {
    const hash = await deployContract(client, {
      abi: SimpleERC20.abi,
      bytecode: SimpleERC20.bytecode.object as Hex,
      chain: null
    });

    await waitBlockTime();

    const { contractAddress } = await getTransactionReceipt(client, {
      hash
    });

    if (!contractAddress) {
      throw new Error("SimpleERC20 contract deployment failed");
    }

    const code = await getCode(client, {
      address: contractAddress
    });

    if (!code) {
      throw new Error("SimpleERC20 contract code not found");
    }

    await setCode(client, {
      address: erc20,
      bytecode: code
    });

    await waitBlockTime();
  }

  // Set multicall3 bytecode
  await setCode(client, {
    address: multicall3Address(),
    bytecode: multicall3Bytecode()
  });
}
