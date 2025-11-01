# StackIt - Decentralized Savings Vault

A Stacks blockchain-based savings application with time-locked deposits and group savings functionality.

## 🚀 Features

### Individual Savings

- **Time-locked deposits**: Choose from 13 lock periods (1 hour to 1 year)
- **Secure storage**: Smart contract enforces lock periods automatically
- **Flexible withdrawals**: Withdraw after lock period expires

### Group Savings

- **Create groups**: Set up savings groups with optional member limits
- **Join groups**: Participate in collective savings goals
- **Shared deposits**: All members contribute to group vaults
- **Proportional withdrawals**: Each member withdraws their individual contributions

## 🛠️ Tech Stack

- **Smart Contract**: Clarity (Stacks blockchain)
- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Wallet**: Stacks Connect (Hiro Wallet)
- **Network**: Stacks Testnet

## 📦 Project Structure

```
├── contracts/
│   └── StackIt.clar           # Main smart contract
├── frontend/                  # Next.js frontend application
│   ├── app/                   # App Router pages
│   ├── components/            # React components
│   ├── hooks/                 # Custom React hooks
│   └── lib/                   # Utility libraries
├── tests/                     # Contract tests
└── deployments/              # Deployment configurations
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Clarinet CLI
- Hiro Wallet browser extension

### 1. Clone & Install

```bash
git clone <repository-url>
cd StackIt
npm install
cd frontend && npm install
```

### 2. Deploy Contract

```bash
# Deploy to testnet
clarinet deployments apply --testnet
```

### 3. Configure Frontend

Update `frontend/.env.local` with your deployed contract address:

```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=<YOUR_DEPLOYED_CONTRACT_ADDRESS>
NEXT_PUBLIC_CONTRACT_NAME=StackIt
NEXT_PUBLIC_NETWORK=testnet
```

### 4. Start Frontend

```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000` and connect your Hiro Wallet!

## 🔧 Development

### Run Tests

```bash
npm test
```

### Build Frontend

```bash
cd frontend
npm run build
```

### Local Development

```bash
# Start local devnet
clarinet devnet start

# Deploy to devnet
clarinet deployments apply --devnet
```

## 📋 Usage

### Individual Savings

1. Connect your Stacks wallet
2. Navigate to "Deposit"
3. Enter amount and select lock period
4. Confirm transaction
5. Wait for lock period to expire
6. Withdraw your funds

### Group Savings

1. Go to "Groups" tab
2. Create a new group or join existing one
3. Set group name, lock duration, and member limit (optional)
4. Members deposit funds after group starts
5. All members can withdraw after lock expires

## 🔒 Security

- **No admin access**: Only users can withdraw their own funds
- **Time-locked**: Smart contract enforces lock periods
- **Transparent**: All transactions visible on blockchain
- **Post-conditions**: Proper STX transfer validation

## 🌐 Deployment

### Testnet

- Contract: `ST3QGZ6VKAQVFT5YFXWMDQGSXK1NVAH8DJ8S7M5SG.StackIt`
- Network: Stacks Testnet
- Explorer: [Stacks Explorer](https://explorer.stacks.co/?chain=testnet)

### Environment Variables

```bash
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_CONTRACT_ADDRESS=ST3QGZ6VKAQVFT5YFXWMDQGSXK1NVAH8DJ8S7M5SG
NEXT_PUBLIC_CONTRACT_NAME=StackIt
NEXT_PUBLIC_STACKS_API_URL=https://api.testnet.hiro.so
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if needed
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.
