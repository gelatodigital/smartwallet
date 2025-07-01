# Gelato SmartWallet SDK

A Modern Account Abstraction SDK for building and interacting with smart wallets.

## Prerequisites

- Node.js >= 23
- pnpm >= 10.8.1

## Packages

- [@gelatonetwork/smartwallet](./src/): All you need to build with Gelato SmartWallets APIs and Contracts.
- [@gelatonetwork/smartwallet-react-sdk](./plugins/react/sdk/): A unified React SDK for Gelato SmartWallet APIs and Contracts that supports multiple WaaS providers: Dynamic and Privy.
- [@gelatonetwork/smartwallet-react-wagmi](./plugins/react/wagmi/): Use Gelato SmartWallet APIs and Contracts with WAGMI applications, without any complexity.


## Overview

```ts
import {
  createGelatoSmartWalletClient,
  sponsored
} from "@gelatonetwork/smartwallet";
import { http, createWalletClient } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);

const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http()
});

const swc = await createGelatoSmartWalletClient(client, { apiKey });

const response = await swc.execute({
    payment: sponsored(apiKey),
    calls: [
      {
        to: "0xEEeBe2F778AA186e88dCf2FEb8f8231565769C27",
        data: "0xd09de08a",
        value: 0n
      }
    ]
});

response.on("submitted", (status) => {
    console.log(`Transaction submitted: ${status.transactionHash}`);
});

response.on("success", async (status) => {
    console.log(`Transaction successful: ${status.transactionHash}`);
});

response.on("error", (error) => {
    console.error(`Transaction failed: ${error.message}`);
});
```

## Quick Start

### NPM

1. Install package
```bash
pnpm i @gelatonetwork/smartwallet
```

### Locally

1. Clone the repository:

```bash
git clone --recurse-submodules https://github.com/gelatodigital/smartwallet.git
cd smartwallet
```

2. Install dependencies:

```bash
pnpm install
```

3. Build the project:

```bash
pnpm build
```

## Running Examples

The project includes several examples in the `examples` directory. To run an example:

1. Navigate to the example directory:

```bash
cd examples/erc20  # or any other example directory
```

2. Install dependencies:

```bash
pnpm install
```

3. Run the example:

```bash
pnpm dev
```

## Project Structure

- `src/` - Gelato SmartWallet SDK
- `plugins/` - Plugins built on top of Gelato SmartWallet SDK
- `examples/` - Example implementations

## Development

- Format code:

```bash
pnpm format
```

- Lint code:

```bash
pnpm lint
```

- Run tests:

```bash
pnpm test
```

## Contributing

1. Create a changeset for your changes:

```bash
pnpm changeset
```

2. Build and test your changes:

```bash
pnpm build
pnpm test
```

3. Submit a pull request

## License

This project is licensed under the terms of the MIT license.
