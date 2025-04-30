# @gelatonetwork/smartwallet-react-sdk

A unified React SDK for Gelato Smart Wallet that supports multiple WaaS providers.

## Features

- Unified interface for Dynamic and Privy WaaS providers
- Connect button component that works with any supported provider
- Simple configuration helpers for different providers

## Usage

### Provider Setup

```tsx
import { 
  GelatoSmartWalletContextProvider,
  dynamic,
  privy,
  wagmi 
} from '@gelatonetwork/smartwallet-react-sdk';

function App() {
  return (
    <GelatoSmartWalletContextProvider
      settings={{
        waas: dynamic('your-dynamic-app-id'), // or privy('your-privy-app-id')
        defaultChain: yourDefaultChain,
        wagmi: wagmi(yourWagmiConfig)
      }}
    >
      <YourApp />
    </GelatoSmartWalletContextProvider>
  );
}
```

### Using the Connect Button

```tsx
import { GelatoSmartWalletConnectButton } from '@gelatonetwork/smartwallet-react-sdk';

function ConnectWallet() {
  return (
    <GelatoSmartWalletConnectButton>
      Connect Wallet
    </GelatoSmartWalletConnectButton>
  );
}
```

### Accessing Wallet Context

```tsx
import { useGelatoSmartWalletProviderContext } from '@gelatonetwork/smartwallet-react-sdk';

function YourComponent() {
  const { gelato, wagmi, logout, switchNetwork, type } = useGelatoSmartWalletProviderContext();
  
  // Access the Gelato client through gelato.client
  const gelatoClient = gelato.client;
  
  // Example: Send a transaction
  const execute = async () => {
    if (!gelatoClient) return;
    
    const hash = await gelatoClient.execute({
        payment,
        calls: [
          {
            to: "0x0...",
            data: "0x0...",
            value: 0n
          }
        ]
      });
  };
}
```
