import { Mega, PaymentFactory } from '@gelatomega/core';
import {
  GelatoMegaDynamicConnectButton,
  GelatoMegaDynamicContextProvider,
  useGelatoMegaDynamicContext
} from '@gelatomega/react-dynamic';
import { useEffect, useState } from 'react';
import { sepolia } from 'viem/chains';

const WalletInfoComponent = () => {
  const { walletClient, handleLogOut, switchNetwork } = useGelatoMegaDynamicContext();
  const [mega, setMega] = useState<Mega | null>(null);

  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const sponsorApiKey = import.meta.env.VITE_SPONSOR_API_KEY;

  switchNetwork(sepolia.id);

  const executeTransaction = async () => {
    if (!mega) return;

    setIsLoading(true);
    try {
      // Example transaction - sending a simple call
      const hash = await mega.execute([
        {
          to: '0xa8851f5f279eD47a292f09CA2b6D40736a51788E',
          data: '0xd09de08a',
          value: 0n
        }
      ]);

      setTransactionHash(hash);
    } catch (error) {
      console.error('Transaction failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initializeMega = async () => {
      if (walletClient?.account && sponsorApiKey) {
        // TODO Sign authorization is undefined since WalletClient is not provided with that from Dynamic, determine how to do that
        console.log(
          'Initializing Mega',
          walletClient.account,
          sponsorApiKey,
          !!walletClient.account.signAuthorization
        );

        try {
          // Create a wallet client with chain and account
          const clientWithChain = {
            ...walletClient,
            chain: sepolia,
            account: walletClient.account
          };

          // Initialize Mega with the wallet client and sponsored payment
          const megaInstance = new Mega(clientWithChain, PaymentFactory.sponsored(sponsorApiKey));

          setMega(megaInstance);
        } catch (error) {
          console.error('Failed to initialize Mega:', error);
        }
      } else {
        console.log('No wallet client or sponsor API key');
      }
    };

    initializeMega();
  }, [walletClient]);

  return (
    <div>
      <h2>Wallet Information</h2>
      {walletClient ? (
        <div>
          <p>Wallet connected!</p>
          <div style={{ marginTop: '20px' }}>
            <h3>Mega Transaction</h3>
            {mega ? (
              <div>
                <button type="button" onClick={executeTransaction} disabled={isLoading}>
                  {isLoading ? 'Processing...' : 'Execute Transaction'}
                </button>
                {transactionHash && <p>Transaction Hash: {transactionHash}</p>}
              </div>
            ) : (
              <p>Mega not initialized</p>
            )}
          </div>
          <p />
          <button type="button" onClick={handleLogOut}>
            Logout
          </button>
        </div>
      ) : (
        <div>
          <p>No wallet connected</p>
          <GelatoMegaDynamicConnectButton>Login</GelatoMegaDynamicConnectButton>
        </div>
      )}
    </div>
  );
};

export default function Providers() {
  const dynamicEnvironmentId = import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID;
  const sponsorApiKey = import.meta.env.VITE_SPONSOR_API_KEY;

  if (!dynamicEnvironmentId || !sponsorApiKey) {
    return (
      <div>
        <h1>Error</h1>
        <p>
          {!dynamicEnvironmentId && 'Dynamic environment ID is not set. '}
          {!sponsorApiKey && 'Sponsor API key is not set. '}
          Please set the required environment variables.
        </p>
      </div>
    );
  }

  return (
    <GelatoMegaDynamicContextProvider
      settings={{
        environmentId: dynamicEnvironmentId
      }}
    >
      <WalletInfoComponent />
    </GelatoMegaDynamicContextProvider>
  );
}
