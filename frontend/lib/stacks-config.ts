/**
 * Stacks Network Configuration
 * Centralizes network settings and contract information for the piggy vault dApp
 */

import { 
  STACKS_MAINNET, 
  STACKS_TESTNET, 
  STACKS_DEVNET 
} from '@stacks/network';

// Network configuration based on environment
export const getStacksNetwork = () => {
  const networkType = process.env.NEXT_PUBLIC_NETWORK || 'testnet';
  
  switch (networkType) {
    case 'mainnet':
      return STACKS_MAINNET;
    case 'testnet':
      return STACKS_TESTNET;
    case 'devnet':
      // For devnet, we'll use a custom configuration
      return {
        ...STACKS_DEVNET,
        coreApiUrl: process.env.NEXT_PUBLIC_STACKS_API_URL || 'http://localhost:3999',
      };
    default:
      return STACKS_TESTNET;
  }
};

// Contract configuration - loaded from environment variables
export const CONTRACT_CONFIG = {
  address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!,
  name: process.env.NEXT_PUBLIC_CONTRACT_NAME!,
} as const;

// Error codes from the Clarity contract
export const CONTRACT_ERRORS = {
  ERR_INVALID_AMOUNT: 100,
  ERR_STILL_LOCKED: 101,
  ERR_NO_DEPOSIT: 102,
  ERR_UNAUTHORIZED: 103,
  ERR_INSUFFICIENT_BALANCE: 104,
} as const;

// Convert microSTX to STX for display
export const microStxToStx = (microStx: number | bigint): number => {
  return Number(microStx) / 1_000_000;
};

// Convert STX to microSTX for transactions
export const stxToMicroStx = (stx: number): bigint => {
  return BigInt(Math.floor(stx * 1_000_000));
};