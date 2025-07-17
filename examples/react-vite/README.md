# Gelato SmartWallet Dynamic Example

This is a simple React example that demonstrates how to use the `GelatoSmartWalletDynamicContextProvider` component from the Gelato SmartWallet SDK and initialize the SmartWallet client with the wallet client.

## Getting Started

1. Install dependencies:

```bash
pnpm install
```

2. Create a `.env` file based on the `.env.example` file:

```bash
cp .env.example .env
```

3. Edit the `.env` file and replace the placeholders with your actual values:

```
VITE_DYNAMIC_ENVIRONMENT_ID=your_dynamic_environment_id_here
VITE_GELATO_API_KEY=your_gelato_api_key_here
```

4. Start the development server:

```bash
pnpm dev
```

5. Open your browser and navigate to `http://localhost:5173`

## Features

- Connects to Dynamic WaaS provider
- Displays wallet information
- Allows getting the wallet address
- Initializes SmartWallet client with the wallet client
- Executes transactions using SmartWallet client
- Provides logout functionality

## How It Works

The example uses the `GelatoSmartWalletDynamicContextProvider` to wrap the application and provide wallet functionality. The `WalletInfo` component demonstrates how to:

1. Access the wallet client from the context
2. Initialize the SmartWallet client with the wallet client
3. Execute transactions using the SmartWallet client
4. Handle user interactions

## Environment Variables

- `VITE_DYNAMIC_ENVIRONMENT_ID`: Your Dynamic environment ID (required)
- `VITE_GELATO_API_KEY`: Your Gelato API key (required)

## Troubleshooting

If you see an error message saying "Dynamic environment ID is not set" or "Gelato API key is not set", make sure you have created a `.env` file with the correct environment variables.
