/**
 * Stacks Network Configuration
 * Centralizes network settings and contract information for the StackIt dApp
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

// Error codes from the updated Clarity contract
export const CONTRACT_ERRORS = {
  ERR_INVALID_AMOUNT: 100,
  ERR_STILL_LOCKED: 101,
  ERR_NO_DEPOSIT: 102,
  ERR_UNAUTHORIZED: 103,
  ERR_INSUFFICIENT_BALANCE: 104,
  ERR_INVALID_LOCK_OPTION: 105, // New error for invalid lock duration options
} as const;

// Convert microSTX to STX for display
export const microStxToStx = (microStx: number | bigint): number => {
  return Number(microStx) / 1_000_000;
};

// Convert STX to microSTX for transactions
export const stxToMicroStx = (stx: number): number => {
  return Math.floor(stx * 1_000_000);
};

// Alternative BigInt version if needed
export const stxToMicroStxBigInt = (stx: number): bigint => {
  return BigInt(Math.floor(stx * 1_000_000));
};
/**

 * Test the STX to microSTX conversion
 * @param stx - Amount in STX
 * @returns Conversion test results
 */
export const testStxConversion = (stx: number) => {
  const microStx = stxToMicroStx(stx);
  const backToStx = microStxToStx(microStx);
  
  return {
    input: stx,
    microStx,
    backToStx,
    isCorrect: Math.abs(backToStx - stx) < 0.000001, // Allow for floating point precision
    details: {
      expectedMicroStx: stx * 1_000_000,
      actualMicroStx: microStx,
      difference: microStx - (stx * 1_000_000)
    }
  };
};

/**
 * Validate STX amount for deposits
 * @param stx - Amount in STX
 * @returns Validation result
 */
export const validateStxAmount = (stx: number): { valid: boolean; error?: string } => {
  if (isNaN(stx) || !isFinite(stx)) {
    return { valid: false, error: 'Amount must be a valid number' };
  }
  
  if (stx <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }
  
  if (stx < 0.000001) {
    return { valid: false, error: 'Minimum amount is 0.000001 STX (1 microSTX)' };
  }
  
  if (stx > 1000000) {
    return { valid: false, error: 'Maximum amount is 1,000,000 STX' };
  }
  
  const microStx = stxToMicroStx(stx);
  if (microStx !== Math.floor(stx * 1_000_000)) {
    return { valid: false, error: 'Conversion error: precision loss detected' };
  }
  
  return { valid: true };
};