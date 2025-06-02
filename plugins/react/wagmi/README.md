# @gelatonetwork/smartwallet-react-wagmi

A React package that provides integration with Privy WaaS (Wallet-as-a-Service) for Gelato Smart Wallet.

## Features

- Privy WaaS integration for Gelato smart wallet management
- Connect button component for easy wallet connection
- Integration with wagmi for Web3 functionality

## Installation

```bash
pnpm add @gelatonetwork/smartwallet-react-privy
```

## Usage

### Provider Setup

```tsx
import { GelatoSmartWalletPrivyContextProvider } from '@gelatonetwork/smartwallet-react-privy';

function App() {
  return (
    <GelatoSmartWalletPrivyContextProvider
      settings={{
        waas: {
          appId: 'your-privy-app-id'
        },
        defaultChain: yourDefaultChain,
        wagmi: {
          config: yourWagmiConfig
        }
      }}
    >
      <YourApp />
    </GelatoSmartWalletPrivyContextProvider>
  );
}
```

### Using the Connect Button

```tsx
import { GelatoSmartWalletPrivyConnectButton } from '@gelatonetwork/smartwallet-react-privy';

function ConnectWallet() {
  return (
    <GelatoSmartWalletPrivyConnectButton>
      Connect Wallet
    </GelatoSmartWalletPrivyConnectButton>
  );
}
```

### Accessing Wallet Context

```tsx
import { useGelatoSmartWalletPrivyContext } from '@gelatonetwork/smartwallet-react-privy';

function YourComponent() {
  const { wagmi, logout, switchNetwork } = useGelatoSmartWalletPrivyContext();

  // Use the context values as needed
}
```
