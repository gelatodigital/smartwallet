# Gelato SmartWallet SDK

A Modern Account Abstraction SDK for building and interacting with smart wallets.

## Prerequisites

- Node.js >= 23
- pnpm >= 10.8.1

## Quick Start

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
