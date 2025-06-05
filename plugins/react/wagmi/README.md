# @gelatonetwork/smartwallet-react-wagmi

Quickly utilize Gelato SmartWallet with Wagmi applications, without any complexity.

## Features

- Drop-in quick utilization
- Integration with wagmi

## Installation
```bash
pnpm add @gelatonetwork/smartwallet-react-wagmi
```

## Usage

Replace `useSendTransaction` and `useWaitForTransactionReceipt` from Wagmi with Gelato SmartWallet's to quickly
integrate Gelato SmartWallet with your Wagmi ready application inside `GelatoSmartWalletProvider` context wrapped with
`WagmiProvider`.

### Provider Setup

```tsx
import { GelatoSmartWalletProvider } from '@gelatonetwork/smartwallet-react-wagmi';

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <GelatoSmartWalletProvider params={sponsorApiKey}>
          <YourApp />
        </GelatoSmartWalletProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

### Accessing Wallet Context

```tsx
import { sponsored } from "@gelatonetwork/smartwallet";
import {
  useSendTransaction,
  useWaitForTransactionReceipt
} from "@gelatonetwork/smartwallet-react-wagmi";

function YourComponent() {
  const {
    sendTransaction,
    data: taskId,
    isPending
  } = useSendTransaction({
    payment: sponsored(sponsorApiKey)
  });

  const { data: receipt } = useWaitForTransactionReceipt({
    id: taskId
  });

  const sendTransactionCallback = useCallback(async () => {
    setTxError(undefined);
    sendTransaction({
        to: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
        data: "0x1234"
      });
  }, [sendTransaction]);

  // use context as your needs
}
```

