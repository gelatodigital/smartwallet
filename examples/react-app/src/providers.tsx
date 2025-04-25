import { createMegaClient, erc20, native, sponsored } from "@gelatomega/core";
import {
  GelatoMegaConnectButton,
  GelatoMegaContextProvider,
  useGelatoMegaProviderContext
} from "@gelatomega/react-sdk";
import { useEffect, useState } from "react";

const WalletInfoComponent = () => {
  const { walletClient, logout } = useGelatoMegaProviderContext();
  // biome-ignore lint/suspicious/noExplicitAny: wanted to prevent several type imports from Viem to just define MegaClient type
  const [mega, setMega] = useState<any | null>(null);
  const [paymentType, setPaymentType] = useState<string>("sponsored");
  // USDC on sepolia
  const [erc20TokenAddress, setErc20TokenAddress] = useState<`0x${string}`>(
    "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
  );
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const sponsorApiKey = import.meta.env.VITE_SPONSOR_API_KEY;

  const executeTransaction = async () => {
    if (!mega) return;

    setIsLoading(true);
    try {
      const payment =
        paymentType === "sponsored"
          ? sponsored(sponsorApiKey)
          : paymentType === "erc20"
            ? erc20(erc20TokenAddress)
            : native();
      // Example transaction - sending a simple call
      const hash = await mega.execute({
        payment,
        calls: [
          {
            to: "0xa8851f5f279eD47a292f09CA2b6D40736a51788E",
            data: "0xd09de08a",
            value: 0n
          }
        ]
      });

      setTransactionHash(hash);
    } catch (error) {
      console.error("Transaction failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initializeMega = async () => {
      if (walletClient?.account && sponsorApiKey) {
        console.log("Initializing Mega", walletClient.account);

        try {
          const megaInstance = createMegaClient(walletClient);
          setMega(megaInstance);
        } catch (error) {
          console.error("Failed to initialize Mega:", error);
        }
      } else {
        console.log("No wallet client or sponsor API key");
      }
    };

    initializeMega();
  }, [walletClient]);

  return (
    <div>
      <h2>Gelato Mega</h2>
      {walletClient ? (
        <div>
          <p>Wallet connected!</p>
          <p>
            Wallet Address:{" "}
            <a
              href={`https://sepolia.etherscan.io/address/${walletClient.account.address}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {walletClient.account.address}
            </a>
          </p>
          <div style={{ marginTop: "20px" }}>
            <h3>Mega Transaction</h3>
            {mega ? (
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
                      <option value="0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238">USDC</option>
                    </select>
                  </div>
                )}
                <button type="button" onClick={executeTransaction} disabled={isLoading}>
                  {isLoading ? "Processing..." : "Execute Transaction"}
                </button>
                {transactionHash && (
                  <p>
                    Transaction Executed:{" "}
                    <a
                      href={`https://sepolia.etherscan.io/tx/${transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      view on explorer
                    </a>
                  </p>
                )}
              </div>
            ) : (
              <p>Mega not initialized</p>
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
          <GelatoMegaConnectButton>Login</GelatoMegaConnectButton>
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
    <GelatoMegaContextProvider
      type="privy"
      settings={{
        appId: waasAppId
      }}
    >
      <WalletInfoComponent />
    </GelatoMegaContextProvider>
  );
}
