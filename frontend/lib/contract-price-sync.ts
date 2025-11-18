/**
 * Contract Price Synchronization Service
 * Syncs real-time STX price with smart contract minimum deposit requirements
 */

import { openContractCall } from '@stacks/connect';
import { uintCV } from '@stacks/transactions';
import { 
  getStacksNetwork, 
  CONTRACT_CONFIG, 
  stxToMicroStx,
  isContractConfigValid,
  getContractConfigError 
} from '@/lib/stacks-config';
import { getMinimumSTXAmount, fetchSTXPrice } from '@/lib/price-oracle';

/**
 * Update the contract's STX/USD price based on current market price
 * This should be called periodically to keep the contract in sync with market prices
 */
export async function updateContractSTXPrice(): Promise<string> {
  // Validate contract configuration
  if (!isContractConfigValid()) {
    const configError = getContractConfigError();
    throw new Error(configError || 'Contract configuration is invalid');
  }

  try {
    const currentPrice = await fetchSTXPrice();
    // Convert to 6 decimal precision for contract (e.g., $0.52 -> 520000)
    const priceWith6Decimals = Math.round(currentPrice * 1000000);
    
    const network = getStacksNetwork();
    
    return new Promise((resolve, reject) => {
      openContractCall({
        network,
        contractAddress: CONTRACT_CONFIG.address,
        contractName: CONTRACT_CONFIG.name,
        functionName: 'update-stx-price',
        functionArgs: [uintCV(priceWith6Decimals)],
        onFinish: (data) => {
          resolve(data.txId);
        },
        onCancel: () => {
          reject(new Error('Transaction cancelled by user'));
        },
      });
    });
  } catch (error) {
    throw new Error(`Failed to update contract STX price: ${error}`);
  }
}

/**
 * Legacy function - Update minimum deposit amount (deprecated in favor of price-based calculation)
 */
export async function updateContractMinimumDeposit(): Promise<string> {
  // This function is now deprecated as the contract calculates minimum based on price
  // Redirect to price update instead
  return updateContractSTXPrice();
}

/**
 * Get the current STX price from the contract
 */
export async function getContractSTXPrice(): Promise<number> {
  try {
    const { callReadOnlyFunction } = await import('@/lib/contract');
    
    const result = await callReadOnlyFunction({
      contractAddress: CONTRACT_CONFIG.address,
      contractName: CONTRACT_CONFIG.name,
      functionName: 'get-stx-usd-price',
      functionArgs: [],
    });

    const priceWith6Decimals = parseInt(result?.value || result || '500000');
    return priceWith6Decimals / 1000000; // Convert from 6 decimal precision to USD
  } catch (error) {
    console.error('Failed to get contract STX price:', error);
    return 0.5; // Fallback value
  }
}

/**
 * Get the current minimum deposit amount from the contract
 */
export async function getContractMinimumDeposit(): Promise<number> {
  try {
    const { callReadOnlyFunction } = await import('@/lib/contract');
    
    const result = await callReadOnlyFunction({
      contractAddress: CONTRACT_CONFIG.address,
      contractName: CONTRACT_CONFIG.name,
      functionName: 'get-minimum-deposit-amount',
      functionArgs: [],
    });

    const microSTX = parseInt(result?.value || result || '4000000');
    return microSTX / 1000000; // Convert microstacks to STX
  } catch (error) {
    console.error('Failed to get contract minimum deposit:', error);
    return 4.0; // Fallback value
  }
}

/**
 * Check if the contract's price is in sync with current market price
 */
export async function isContractPriceInSync(): Promise<{
  inSync: boolean;
  contractPrice: number;
  marketPrice: number;
  contractMinimum: number;
  marketMinimum: number;
  priceDifference: number;
  minimumDifference: number;
}> {
  try {
    const [contractPrice, marketPrice, contractMinimum, marketMinimum] = await Promise.all([
      getContractSTXPrice(),
      fetchSTXPrice(),
      getContractMinimumDeposit(),
      getMinimumSTXAmount(),
    ]);

    const priceDifference = Math.abs(contractPrice - marketPrice);
    const minimumDifference = Math.abs(contractMinimum - marketMinimum);
    const pricePercentageDiff = (priceDifference / marketPrice) * 100;
    
    // Consider in sync if price is within 5% of market price
    const inSync = pricePercentageDiff <= 5;

    return {
      inSync,
      contractPrice,
      marketPrice,
      contractMinimum,
      marketMinimum,
      priceDifference,
      minimumDifference,
    };
  } catch (error) {
    console.error('Failed to check sync status:', error);
    return {
      inSync: false,
      contractPrice: 0.5,
      marketPrice: 0.5,
      contractMinimum: 4.0,
      marketMinimum: 4.0,
      priceDifference: 0,
      minimumDifference: 0,
    };
  }
}

/**
 * Legacy function for backward compatibility
 */
export async function isContractMinimumInSync() {
  const syncData = await isContractPriceInSync();
  return {
    inSync: syncData.inSync,
    contractMinimum: syncData.contractMinimum,
    marketMinimum: syncData.marketMinimum,
    difference: syncData.minimumDifference,
  };
}

/**
 * Auto-sync service that can be run periodically
 * Returns true if sync was needed and attempted
 */
export async function autoSyncContractPrice(): Promise<{
  syncNeeded: boolean;
  syncAttempted: boolean;
  txId?: string;
  error?: string;
}> {
  try {
    const syncStatus = await isContractPriceInSync();
    
    if (syncStatus.inSync) {
      return {
        syncNeeded: false,
        syncAttempted: false,
      };
    }

    // Sync is needed, attempt to update
    try {
      const txId = await updateContractSTXPrice();
      return {
        syncNeeded: true,
        syncAttempted: true,
        txId,
      };
    } catch (error) {
      return {
        syncNeeded: true,
        syncAttempted: true,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  } catch (error) {
    return {
      syncNeeded: false,
      syncAttempted: false,
      error: error instanceof Error ? error.message : 'Failed to check sync status',
    };
  }
}

/**
 * Legacy function for backward compatibility
 */
export async function autoSyncContractMinimum() {
  return autoSyncContractPrice();
}