/**
 * Contract interaction utilities for StackIt
 * Handles all read and write operations with the updated time-based lock Clarity smart contract
 * Updated to support the new contract's time-based lock periods and enhanced functionality
 */

import { getStacksNetwork, CONTRACT_CONFIG, microStxToStx } from './stacks-config';
import { fetchCallReadOnlyFunction, cvToJSON, standardPrincipalCV } from '@stacks/transactions';

export interface DepositInfo {
  amount: number;
  depositBlock: number;
  lockExpiry?: number;
  lockOption?: number;
}

export interface TransactionResult {
  success: boolean;
  txId?: string;
  error?: string;
}

// Contract error codes (matching the updated contract)
export const CONTRACT_ERRORS = {
  ERR_INVALID_AMOUNT: 100,
  ERR_STILL_LOCKED: 101,
  ERR_NO_DEPOSIT: 102,
  ERR_UNAUTHORIZED: 103,
  ERR_INSUFFICIENT_BALANCE: 104,
  ERR_INVALID_LOCK_OPTION: 105,
} as const;

/**
 * Get deposit information for a specific user
 * Calls the contract's get-deposit read-only function
 */
export const getUserDeposit = async (userAddress: string): Promise<DepositInfo> => {
  try {
    const network = getStacksNetwork();
    
    // Call the contract's get-deposit function
    const result = await fetchCallReadOnlyFunction({
      contractAddress: CONTRACT_CONFIG.address,
      contractName: CONTRACT_CONFIG.name,
      functionName: 'get-deposit',
      functionArgs: [standardPrincipalCV(userAddress)],
      network,
      senderAddress: userAddress,
    });

    const depositData = cvToJSON(result);
    
    // The contract returns: { amount: uint, deposit-block: uint, lock-expiry: uint }
    if (depositData && typeof depositData === 'object' && 'value' in depositData) {
      const data = depositData.value as Record<string, { value: number }>;
      return {
        amount: microStxToStx(Number(data.amount?.value || 0)),
        depositBlock: Number(data['deposit-block']?.value || 0),
        lockExpiry: Number(data['lock-expiry']?.value || 0),
        lockOption: undefined, // We'll need to derive this from lock duration if needed
      };
    }

    // Return empty deposit if no data found
    return {
      amount: 0,
      depositBlock: 0,
      lockExpiry: 0,
      lockOption: 0,
    };
  } catch (error) {
    console.error('Error fetching user deposit:', error);
    return {
      amount: 0,
      depositBlock: 0,
      lockExpiry: 0,
      lockOption: 0,
    };
  }
};

/**
 * Get user balance from the vault
 * Calls the contract's get-balance read-only function
 */
export const getUserBalance = async (userAddress: string): Promise<number> => {
  try {
    const network = getStacksNetwork();
    
    // Call the contract's get-balance function
    const result = await fetchCallReadOnlyFunction({
      contractAddress: CONTRACT_CONFIG.address,
      contractName: CONTRACT_CONFIG.name,
      functionName: 'get-balance',
      functionArgs: [standardPrincipalCV(userAddress)],
      network,
      senderAddress: userAddress,
    });

    const balanceData = cvToJSON(result);
    
    // The contract returns a uint representing balance in microSTX
    if (balanceData && typeof balanceData === 'object' && 'value' in balanceData) {
      return microStxToStx(Number(balanceData.value));
    }

    return 0;
  } catch (error) {
    console.error('Error fetching user balance:', error);
    return 0;
  }
};

/**
 * Check if user can withdraw (lock period has passed)
 * Updated to use the new contract's lock expiry system
 * @param lockExpiry - Block height when lock expires
 * @param currentBlock - Current block height
 * @returns Whether withdrawal is allowed
 */
export const canWithdraw = (
  lockExpiry: number,
  currentBlock: number
): boolean => {
  return currentBlock >= lockExpiry;
};

/**
 * Get user's lock status from the contract
 * Calls the contract's is-locked read-only function
 * @param userAddress - User's Stacks address
 * @returns Promise<boolean> - Whether the user's funds are currently locked
 */
export const isUserLocked = async (userAddress: string): Promise<boolean> => {
  try {
    const network = getStacksNetwork();
    
    // Call the contract's is-locked function
    const result = await fetchCallReadOnlyFunction({
      contractAddress: CONTRACT_CONFIG.address,
      contractName: CONTRACT_CONFIG.name,
      functionName: 'is-locked',
      functionArgs: [standardPrincipalCV(userAddress)],
      network,
      senderAddress: userAddress,
    });

    const lockStatus = cvToJSON(result);
    
    // The contract returns a boolean
    if (lockStatus && typeof lockStatus === 'object' && 'value' in lockStatus) {
      return Boolean(lockStatus.value);
    }

    return false;
  } catch (error) {
    console.error('Error checking lock status:', error);
    return false;
  }
};

/**
 * Get remaining lock time in blocks
 * Calls the contract's get-remaining-lock-blocks read-only function
 * @param userAddress - User's Stacks address
 * @returns Promise<number> - Number of blocks remaining in lock period
 */
export const getRemainingLockBlocks = async (userAddress: string): Promise<number> => {
  try {
    const network = getStacksNetwork();
    
    // Call the contract's get-remaining-lock-blocks function
    const result = await fetchCallReadOnlyFunction({
      contractAddress: CONTRACT_CONFIG.address,
      contractName: CONTRACT_CONFIG.name,
      functionName: 'get-remaining-lock-blocks',
      functionArgs: [standardPrincipalCV(userAddress)],
      network,
      senderAddress: userAddress,
    });

    const remainingBlocks = cvToJSON(result);
    
    // The contract returns a uint representing remaining blocks
    if (remainingBlocks && typeof remainingBlocks === 'object' && 'value' in remainingBlocks) {
      return Number(remainingBlocks.value);
    }

    return 0;
  } catch (error) {
    console.error('Error fetching remaining lock blocks:', error);
    return 0;
  }
};

/**
 * Get lock expiry block height for a user
 * Calls the contract's get-lock-expiry read-only function
 * @param userAddress - User's Stacks address
 * @returns Promise<number> - Block height when lock expires
 */
export const getLockExpiry = async (userAddress: string): Promise<number> => {
  try {
    const network = getStacksNetwork();
    
    // Call the contract's get-lock-expiry function
    const result = await fetchCallReadOnlyFunction({
      contractAddress: CONTRACT_CONFIG.address,
      contractName: CONTRACT_CONFIG.name,
      functionName: 'get-lock-expiry',
      functionArgs: [standardPrincipalCV(userAddress)],
      network,
      senderAddress: userAddress,
    });

    const lockExpiry = cvToJSON(result);
    
    // The contract returns a uint representing lock expiry block
    if (lockExpiry && typeof lockExpiry === 'object' && 'value' in lockExpiry) {
      return Number(lockExpiry.value);
    }

    return 0;
  } catch (error) {
    console.error('Error fetching lock expiry:', error);
    return 0;
  }
};

/**
 * Get current Stacks block height
 * Fetches from the Stacks API
 * @returns Promise<number> - Current block height
 */
export const getCurrentBlockHeight = async (): Promise<number> => {
  try {
    const network = getStacksNetwork();
    // Use the correct property name for API URL
    const apiUrl = 'coreApiUrl' in network ? network.coreApiUrl : 
                   'url' in network ? network.url : 
                   process.env.NEXT_PUBLIC_STACKS_API_URL || 'https://api.testnet.hiro.so';
    
    const response = await fetch(`${apiUrl}/v2/info`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return Number(data.stacks_tip_height || 0);
  } catch (error) {
    console.error('Error fetching current block height:', error);
    return 0;
  }
};

/**
 * Note: Deposit and withdrawal functions are handled by Stacks Connect
 * in the React components. This provides a better user experience
 * as users can sign transactions directly in their wallet.
 * 
 * The actual transaction building happens in the components using:
 * - @stacks/connect for wallet integration
 * - @stacks/transactions for transaction building
 * 
 * Updated example usage for the new time-based contract:
 * 
 * import { openContractCall } from '@stacks/connect';
 * import { uintCV } from '@stacks/transactions';
 * 
 * // Deposit with time-based lock option
 * await openContractCall({
 *   contractAddress: CONTRACT_CONFIG.address,
 *   contractName: CONTRACT_CONFIG.name,
 *   functionName: 'deposit',
 *   functionArgs: [
 *     uintCV(amountMicroStx),  // Amount in microSTX
 *     uintCV(lockOption)       // Lock duration option (1-13)
 *   ],
 *   onFinish: (data) => console.log('Transaction ID:', data.txId),
 * });
 * 
 * // Withdraw (unchanged)
 * await openContractCall({
 *   contractAddress: CONTRACT_CONFIG.address,
 *   contractName: CONTRACT_CONFIG.name,
 *   functionName: 'withdraw',
 *   functionArgs: [uintCV(amountMicroStx)],
 *   onFinish: (data) => console.log('Transaction ID:', data.txId),
 * });
 */
/*
*
 * Helper function to handle contract call errors
 * @param error - The error object
 * @returns User-friendly error message
 */
export const handleContractError = (error: unknown): string => {
  if (error instanceof Error) {
    // Check for specific contract errors
    if (error.message.includes('100')) return 'Invalid amount provided';
    if (error.message.includes('101')) return 'Funds are still locked';
    if (error.message.includes('102')) return 'No deposit found';
    if (error.message.includes('103')) return 'Unauthorized operation';
    if (error.message.includes('104')) return 'Insufficient balance';
    if (error.message.includes('105')) return 'Invalid lock option';
    
    return error.message;
  }
  
  return 'An unknown error occurred';
};

/**
 * Validate contract configuration
 * @returns boolean indicating if configuration is valid
 */
export const validateContractConfig = (): boolean => {
  return !!(CONTRACT_CONFIG.address && CONTRACT_CONFIG.name);
};

/**
 * Get contract info for debugging
 * @returns Contract configuration object
 */
export const getContractInfo = () => {
  return {
    address: CONTRACT_CONFIG.address,
    name: CONTRACT_CONFIG.name,
    network: getStacksNetwork(),
    isValid: validateContractConfig(),
  };
};

/**
 * Verify if the contract exists on the network
 * @returns Promise<boolean> - Whether the contract exists
 */
export const verifyContractExists = async (): Promise<boolean> => {
  try {
    const network = getStacksNetwork();
    const apiUrl = 'coreApiUrl' in network ? network.coreApiUrl : 
                   'url' in network ? network.url : 
                   process.env.NEXT_PUBLIC_STACKS_API_URL || 'https://api.testnet.hiro.so';
    
    const response = await fetch(`${apiUrl}/v2/contracts/interface/${CONTRACT_CONFIG.address}/${CONTRACT_CONFIG.name}`);
    
    if (response.ok) {
      const contractInfo = await response.json();
      console.log('Contract found:', contractInfo);
      return true;
    } else {
      console.error('Contract not found:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('Error verifying contract:', error);
    return false;
  }
};

/**
 * Get contract source code for debugging
 * @returns Promise<string> - Contract source code
 */
export const getContractSource = async (): Promise<string> => {
  try {
    const network = getStacksNetwork();
    const apiUrl = 'coreApiUrl' in network ? network.coreApiUrl : 
                   'url' in network ? network.url : 
                   process.env.NEXT_PUBLIC_STACKS_API_URL || 'https://api.testnet.hiro.so';
    
    const response = await fetch(`${apiUrl}/v2/contracts/source/${CONTRACT_CONFIG.address}/${CONTRACT_CONFIG.name}`);
    
    if (response.ok) {
      const data = await response.json();
      return data.source || 'No source available';
    } else {
      return `Contract not found: ${response.status}`;
    }
  } catch (error) {
    return `Error fetching contract: ${error}`;
  }
};