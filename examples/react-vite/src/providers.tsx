import {
  type GelatoTaskStatus,
  createGelatoSmartWalletClient,
  erc20,
  native,
  sponsored
} from "@gelatodigital/smartwallet";
import {
  GelatoSmartWalletConnectButton,
  GelatoSmartWalletContextProvider,
  dynamic,
  useGelatoSmartWalletProviderContext,
  wagmi
} from "@gelatodigital/smartwallet-react-sdk";
import { useEffect, useState } from "react";
import { http, useAccount } from "wagmi";

import { sepolia } from "viem/chains";

const WalletInfoComponent = () => {
  const {
    wagmi: { client: walletClient },
    logout
  } = useGelatoSmartWalletProviderContext();
  // biome-ignore lint/suspicious/noExplicitAny: wanted to prevent several type imports from Viem to just define SmartWalletClient type
  const [gelatoSmartWallet, setGelatoSmartWallet] = useState<any | null>(null);
  const [paymentType, setPaymentType] = useState<string>("sponsored");
  // USDC on sepolia
  const [erc20TokenAddress, setErc20TokenAddress] = useState<`0x${string}`>(
    "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9"
  );
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { address: walletAddress } = useAccount();
  const sponsorApiKey = import.meta.env.VITE_SPONSOR_API_KEY;

  const executeTransaction = async () => {
    if (!gelatoSmartWallet) return;

    setIsLoading(true);
    try {
      const payment =
        paymentType === "sponsored"
          ? sponsored(sponsorApiKey)
          : paymentType === "erc20"
            ? erc20(erc20TokenAddress)
            : native();
      // Example transaction - sending a simple call
      const megaResponse = await gelatoSmartWallet.execute({
        payment,
        calls: [
          {
            to: "0xa8851f5f279eD47a292f09CA2b6D40736a51788E",
            data: "0xd09de08a",
            value: 0n
          }
        ]
      });

      megaResponse.on("success", (status: GelatoTaskStatus) => {
        console.log("Transaction successful:", status.transactionHash);
      });

      const megaTransactionHash = await megaResponse.wait();

      setTransactionHash(megaTransactionHash);
    } catch (error) {
      console.error("Transaction failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initializeSmartWallet = async () => {
      if (walletClient?.account && sponsorApiKey) {
        console.log("Initializing SmartWallet", walletClient.account);

        try {
          const gelatoSmartWalletInstance = createGelatoSmartWalletClient(walletClient);
          setGelatoSmartWallet(gelatoSmartWalletInstance);
        } catch (error) {
          console.error("Failed to initialize SmartWallet:", error);
        }
      } else {
        console.log("No wallet client or sponsor API key");
      }
    };

    initializeSmartWallet();
  }, [walletClient]);

  return (
    <div>
      <h2>Gelato SmartWallet</h2>
      {walletClient ? (
        <div>
          <p>Wallet connected!</p>
          <p>
            Wallet Address:{" "}
            <a
              href={`https://sepolia.etherscan.io/address/${walletAddress}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {walletAddress}
            </a>
          </p>
          <div style={{ marginTop: "20px" }}>
            <h3>SmartWallet Transaction</h3>
            {gelatoSmartWallet ? (
              <div>
                <div style={{ marginBottom: "15px" }}>
                  <label htmlFor="paymentType" style={{ marginRight: "10px" }}>
                    Payment Type:
                  </label>
                  <select
                    id="paymentType"
                    onChange={(e) => {
                      setPaymentType(e.target.value);
                    }}
                    style={{ padding: "5px", borderRadius: "4px" }}
                  >
                    <option value="sponsored">Sponsored</option>
                    <option value="erc20">ERC20</option>
                    <option value="native">Native</option>
                  </select>
                </div>
                {paymentType === "erc20" && (
                  <div style={{ marginBottom: "15px" }}>
                    <label htmlFor="tokenSelect" style={{ marginRight: "10px" }}>
                      Select Token:
                    </label>
                    <select
                      id="tokenSelect"
                      onChange={(e) => {
                        setErc20TokenAddress(e.target.value as `0x${string}`);
                      }}
                      style={{ padding: "5px", borderRadius: "4px" }}
                    >
                      <option value="0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9">WETH</option>
                    </select>
                  </div>
                )}
                <button type="button" onClick={executeTransaction} disabled={isLoading}>
                  {isLoading ? "Processing..." : "Execute Transaction"}
                </button>
                {transactionHash && (
                  <p>
                    Transaction Hash:{" "}
                    <a
                      href={`https://sepolia.etherscan.io/tx/${transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {transactionHash}
                    </a>
                  </p>
                )}
              </div>
            ) : (
              <p>SmartWallet not initialized</p>
            )}
          </div>
          <p />
          <button type="button" onClick={logout}>
            Logout
          </button>
        </div>
      ) : (
        <div>
          <p>No wallet connected</p>
          <GelatoSmartWalletConnectButton>Login</GelatoSmartWalletConnectButton>
        </div>
      )}
    </div>
  );
};

export default function Providers() {
  const sponsorApiKey = import.meta.env.VITE_SPONSOR_API_KEY;
  const waasAppId = import.meta.env.VITE_WAAS_APP_ID;

  if (!waasAppId || !sponsorApiKey) {
    return (
      <div>
        <h1>Error</h1>
        <p>
          {!waasAppId && "WAAS app ID is not set. "}
          {!sponsorApiKey && "Sponsor API key is not set. "}
          Please set the required environment variables.
        </p>
      </div>
    );
  }

  return (
    <GelatoSmartWalletContextProvider
      // Changing this to `dynamic` or `privy` is enough to change WaaS provider
      // VITE_WAAS_APP_ID also needs to be set accordingly
      settings={{
        waas: dynamic(waasAppId),
        wagmi: wagmi({
          chains: [sepolia],
          transports: {
            [sepolia.id]: http()
          }
        })
      }}
    >
      <WalletInfoComponent />
    </GelatoSmartWalletContextProvider>
  );
}
