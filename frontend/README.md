# Piggy Vault Frontend

A Next.js frontend for the Piggy Vault Clarity smart contract - a decentralized savings vault with time-locked deposits on the Stacks blockchain.

## 🏗️ Architecture Overview

### Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout with navigation
│   ├── page.tsx           # Dashboard (main page)
│   ├── deposit/           # Deposit page
│   └── withdraw/          # Withdraw page
├── components/            # Reusable React components
│   ├── wallet-connect.tsx # Wallet connection UI
│   ├── vault-info.tsx     # Vault balance & status display
│   ├── deposit-form.tsx   # STX deposit form
│   ├── withdraw-form.tsx  # STX withdrawal form
│   └── navbar.tsx         # Navigation bar
├── hooks/                 # Custom React hooks
│   └── use-stacks.ts      # Stacks wallet connection hook
├── lib/                   # Utility libraries
│   ├── contract.ts        # Smart contract interaction functions
│   ├── stacks-config.ts   # Network & contract configuration
│   └── stx-utils.ts       # STX formatting & validation utilities
└── .env.local            # Environment configuration
```

## 🔗 Smart Contract Integration

### Contract Functions Mapped to UI Components

| Contract Function   | Frontend Component | Description                                  |
| ------------------- | ------------------ | -------------------------------------------- |
| `deposit(amount)`   | `DepositForm`      | Allows users to deposit STX with lock period |
| `withdraw(amount)`  | `WithdrawForm`     | Enables withdrawal after lock expires        |
| `get-deposit(user)` | `VaultInfo`        | Displays user's deposit info and lock status |
| `get-balance(user)` | `VaultInfo`        | Shows current vault balance                  |

### Error Handling

The frontend handles all Clarity contract errors:

- `ERR-INVALID-AMOUNT` (100): Invalid deposit/withdrawal amount
- `ERR-STILL-LOCKED` (101): Attempting withdrawal before lock expires
- `ERR-NO-DEPOSIT` (102): No deposit found for user
- `ERR-UNAUTHORIZED` (103): Unauthorized admin action
- `ERR-INSUFFICIENT-BALANCE` (104): Insufficient balance for withdrawal

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Stacks wallet (Hiro Wallet recommended)
- Contract deployed on testnet

### Installation & Setup

1. **Install dependencies:**

   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment:**

   ```bash
   # .env.local is already configured for testnet
   # Current configuration:
   NEXT_PUBLIC_NETWORK=testnet
   NEXT_PUBLIC_CONTRACT_ADDRESS=ST3QGZ6VKAQVFT5YFXWMDQGSXK1NVAH8DJ8S7M5SG
   NEXT_PUBLIC_CONTRACT_NAME=piggy-vault
   NEXT_PUBLIC_STACKS_API_URL=https://api.testnet.hiro.so
   ```

3. **Start development server:**

   ```bash
   npm run dev
   ```

4. **Access the application:**
   Open [http://localhost:3000](http://localhost:3000) in your browser

### Contract Deployment

Ensure the piggy-vault contract is deployed to your target network before using the frontend.

## 🔧 Key Features

### Wallet Integration

- **Modern Stacks Connect**: Uses latest `@stacks/connect` for wallet integration
- **Session Management**: Persistent wallet connection across page reloads
- **Network Detection**: Automatically adapts to testnet/mainnet

### User Experience

- **Real-time Updates**: Vault info refreshes after transactions
- **Lock Status Indicators**: Visual feedback on deposit lock periods
- **Transaction Feedback**: Success/error messages with transaction IDs
- **Responsive Design**: Works on desktop and mobile devices

### Security Features

- **Input Validation**: Client-side validation for amounts and addresses
- **Error Boundaries**: Graceful handling of contract and network errors
- **No Private Key Storage**: Uses Stacks Connect for secure transactions

## 🎯 Usage Guide

### 1. Connect Wallet

- Click "Connect Wallet" on the dashboard
- Approve connection in your Stacks wallet
- Your address will appear in the navigation bar

### 2. Make a Deposit

- Navigate to the Deposit page
- Enter STX amount (minimum 0.000001 STX)
- Confirm transaction in your wallet
- Funds are locked for 50 blocks (~8.3 hours)

### 3. Check Vault Status

- View your balance and lock status on the dashboard
- See remaining blocks until unlock
- Monitor deposit block height and current block

### 4. Withdraw Funds

- Navigate to the Withdraw page after lock period expires
- Enter withdrawal amount (up to your balance)
- Confirm transaction in your wallet
- Funds are transferred immediately

## 🔍 Technical Implementation

### State Management

- **React Hooks**: Uses built-in hooks for local state
- **Custom Hooks**: `useStacks` for wallet connection state
- **No External Store**: Keeps it simple with component-level state

### Network Communication

- **Read Operations**: Direct calls to Stacks API for balance queries
- **Write Operations**: Uses Stacks Connect for transaction signing
- **Error Handling**: Comprehensive error catching and user feedback

### Styling

- **Tailwind CSS**: Utility-first CSS framework
- **Responsive Design**: Mobile-first approach
- **Accessibility**: Proper ARIA labels and keyboard navigation

## 🧪 Development & Testing

### Development

```bash
# Contract is already deployed on testnet
# Start frontend (in frontend directory)
npm run dev
```

### Building for Production

```bash
npm run build
npm start
```

### Environment Configuration

Update `.env.local` for different networks:

**Testnet:**

```env
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_CONTRACT_ADDRESS=<your-testnet-address>
NEXT_PUBLIC_STACKS_API_URL=https://api.testnet.hiro.so
```

**Mainnet:**

```env
NEXT_PUBLIC_NETWORK=mainnet
NEXT_PUBLIC_CONTRACT_ADDRESS=<your-mainnet-address>
NEXT_PUBLIC_STACKS_API_URL=https://api.hiro.so
```

## 📚 Dependencies

### Core Dependencies

- **Next.js 16**: React framework with App Router
- **React 19**: Latest React with concurrent features
- **@stacks/connect**: Wallet connection and transaction signing
- **@stacks/transactions**: Transaction building utilities
- **@stacks/network**: Network configuration
- **Tailwind CSS**: Utility-first styling

### Development Dependencies

- **TypeScript**: Type safety and better DX
- **ESLint**: Code linting and formatting

## 🔒 Security Considerations

1. **No Private Keys**: Never stores or handles private keys
2. **Environment Variables**: Sensitive config in environment variables
3. **Input Validation**: All user inputs are validated client-side
4. **Contract Verification**: Always verify contract addresses before deployment
5. **HTTPS Only**: Use HTTPS in production for secure communication

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on git push

### Other Platforms

The app can be deployed to any platform supporting Next.js:

- Netlify
- AWS Amplify
- Railway
- Self-hosted with Docker

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with proper TypeScript types
4. Add comments explaining complex logic
5. Test thoroughly with different wallet states
6. Submit a pull request

## 📄 License

This project is part of the Piggy Vault dApp and follows the same license as the main project.
