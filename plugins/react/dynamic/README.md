# @gelatonetwork/smartwallet-react-dynamic

A React package that provides integration with Dynamic WaaS (Wallet-as-a-Service) for Gelato Smart Wallet.

## Features

- Dynamic WaaS integration for Gelato smart wallet management
- Connect button component for easy wallet connection
- Integration with wagmi for Web3 functionality

## Installation

```bash
pnpm add @gelatonetwork/smartwallet-react-dynamic
```

## Usage

### Provider Setup

```tsx
import { GelatoSmartWalletDynamicContextProvider } from '@gelatonetwork/smartwallet-react-dynamic';

function App() {
  return (
    <GelatoSmartWalletDynamicContextProvider
      settings={{
        waas: {
          appId: 'your-dynamic-app-id'
        },
        defaultChain: yourDefaultChain,
        wagmi: {
          config: yourWagmiConfig
        }
      }}
    >
      <YourApp />
    </GelatoSmartWalletDynamicContextProvider>
  );
}
```

### Using the Connect Button

```tsx
import { GelatoSmartWalletDynamicConnectButton } from '@gelatonetwork/smartwallet-react-dynamic';

function ConnectWallet() {
  return (
    <GelatoSmartWalletDynamicConnectButton>
      Connect Wallet
    </GelatoSmartWalletDynamicConnectButton>
  );
}
```

### Accessing Wallet Context

```tsx
import { useGelatoSmartWalletDynamicContext } from '@gelatonetwork/smartwallet-react-dynamic';

function YourComponent() {
  const { wagmi, logout, switchNetwork } = useGelatoSmartWalletDynamicContext();
  
  // Use the context values as needed
}
```
