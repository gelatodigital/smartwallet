import { uniswap } from "@gelatonetwork/smartwallet/accounts";
import {
  type Address,
  type Call,
  type Chain,
  createWalletClient,
  encodeFunctionData,
  erc20Abi,
  type Hash,
  type Hex,
  http,
  type PublicClient,
  publicActions,
  type SignedAuthorization,
  type Transport
} from "viem";
import {
  type BundlerClient,
  createBundlerClient,
  formatUserOperationRequest,
  type SmartAccount,
  type UserOperation
} from "viem/account-abstraction";
import { privateKeyToAccount } from "viem/accounts";
import { signAuthorization } from "viem/actions";
import { unichainSepolia } from "viem/chains";

const GELATO_API_KEY = process.env.GELATO_API_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!GELATO_API_KEY) {
  throw new Error("GELATO_API_KEY is not set");
}

if (!PRIVATE_KEY) {
  throw new Error("PRIVATE_KEY is not set");
}

const chain = unichainSepolia;
const token = "0x31d0220469e10c4E71834a79b1f276d740d3768F"; // USDC on Unichain Sepolia

const createBundlerTransport = (
  chain: Chain,
  payment: { type: "sponsored" } | { type: "token"; address: Address }
): Transport => {
  const base = chain.testnet ? "https://api.t.gelato.cloud" : "https://api.gelato.cloud";
  const endpoint = `${base}/rpc/${chain.id}?payment=${payment.type}${payment.type === "token" ? `&token=${payment.address}` : ""}`;

  return http(endpoint, {
    fetchOptions: {
      headers: {
        "X-API-Key": GELATO_API_KEY
      }
    }
  });
};

const getCapabilities = async (
  bundler: BundlerClient<Transport, Chain>
): Promise<{ feeCollector: Address }> => {
  const capabilities = await bundler.request({
    method: "relayer_getCapabilities",
    params: [bundler.chain.id.toString()]
  } as never);

  return capabilities[bundler.chain.id.toString()];
};

const getUserOperationQuote = async (
  bundler: BundlerClient<Transport, Chain, SmartAccount>,
  userOperation: UserOperation
): Promise<{
  fee: bigint;
  gas: bigint;
  l1Fee?: bigint;
  preVerificationGas: bigint;
  verificationGasLimit: bigint;
  callGasLimit: bigint;
}> => {
  const quote = await bundler.request({
    method: "gelato_getUserOperationQuote",
    params: [formatUserOperationRequest(userOperation), bundler.account.entryPoint.address]
  } as never);

  const { fee, gas, l1Fee, preVerificationGas, verificationGasLimit, callGasLimit } = quote as any;

  return {
    callGasLimit: BigInt(callGasLimit),
    fee: BigInt(fee),
    gas: BigInt(gas),
    l1Fee: l1Fee ? BigInt(l1Fee) : undefined,
    preVerificationGas: BigInt(preVerificationGas),
    verificationGasLimit: BigInt(verificationGasLimit)
  };
};

const sendUserOperation = async (
  bundler: BundlerClient<Transport, Chain, SmartAccount>,
  userOperation: UserOperation
): Promise<Hash> => {
  const hash = await bundler.request({
    method: "eth_sendUserOperation",
    params: [formatUserOperationRequest(userOperation), bundler.account.entryPoint.address]
  });

  return hash;
};

// Use this instead of bundler.sendUserOperation
// In the future this will be contained in an SDK so this won't be necessary
const sendCalls = async (
  bundler: BundlerClient<Transport, Chain, SmartAccount>,
  calls: Call[]
): Promise<Hash> => {
  const capabilities = await getCapabilities(bundler);

  const mockPayment: Call = {
    data: encodeFunctionData({
      abi: erc20Abi,
      args: [capabilities.feeCollector, 1n],
      functionName: "transfer"
    }),
    to: token
  };

  const [mockCallData, nonce, isDeployed, mockSignature, sender, factory] = await Promise.all([
    bundler.account.encodeCalls([...calls, mockPayment]),
    bundler.account.getNonce(),
    bundler.account.isDeployed(),
    bundler.account.getStubSignature(),
    bundler.account.getAddress(),
    bundler.account.getFactoryArgs()
  ]);

  const mockAuthorization =
    !isDeployed && bundler.account.authorization
      ? ({
          address: bundler.account.authorization.address,
          chainId: bundler.chain.id,
          nonce: 0,
          r: "0xfffffffffffffffffffffffffffffff000000000000000000000000000000000",
          s: "0x7aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          yParity: 1
        } as SignedAuthorization)
      : undefined;

  const partialUserOperation = {
    authorization: mockAuthorization,
    callData: mockCallData,
    factory: factory.factory,
    factoryData: factory.factoryData,
    maxFeePerGas: 0n,
    maxPriorityFeePerGas: 0n,
    nonce,
    sender,
    signature: mockSignature
  } as UserOperation;

  const { fee, preVerificationGas, verificationGasLimit, callGasLimit } =
    await getUserOperationQuote(bundler, partialUserOperation);

  const payment: Call = {
    data: encodeFunctionData({
      abi: erc20Abi,
      args: [capabilities.feeCollector, fee],
      functionName: "transfer"
    }),
    to: token
  };

  const callData = await bundler.account.encodeCalls([...calls, payment]);

  const authorization =
    !isDeployed && bundler.account.authorization
      ? await signAuthorization(bundler, {
          address: bundler.account.authorization.address,
          chainId: bundler.chain.id,
          nonce: await (bundler.account.client as PublicClient).getTransactionCount({
            address: bundler.account.authorization.account.address
          })
        })
      : undefined;

  const userOperation: UserOperation = {
    ...partialUserOperation,
    authorization,
    callData,
    callGasLimit,
    preVerificationGas,
    verificationGasLimit
  };

  userOperation.signature = await bundler.account.signUserOperation(userOperation);

  return await sendUserOperation(bundler, userOperation);
};

const main = async () => {
  const owner = privateKeyToAccount(PRIVATE_KEY as Hex);

  const client = createWalletClient({
    account: owner,
    chain,
    transport: http()
  }).extend(publicActions);

  const account = await uniswap({
    client,
    owner
  });

  const bundler = createBundlerClient({
    account,
    client,
    pollingInterval: 100,
    transport: createBundlerTransport(chain, { address: token, type: "token" })
  });

  const hash = await sendCalls(bundler, [
    {
      data: "0xd09de08a",
      to: "0xE27C1359cf02B49acC6474311Bd79d1f10b1f8De"
    }
  ]);

  console.log("userOpHash:", hash);

  const { receipt } = await bundler.waitForUserOperationReceipt({ hash });

  console.log("transaction hash:", receipt.transactionHash);
  process.exit(1);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
