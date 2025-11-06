/**
 * Price Oracle Admin Component
 * Allows authorized users to update the STX/USD price in the smart contract
 * Provides synchronization between off-chain market data and on-chain enforcement
 */

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { useSTXPrice } from '@/hooks/use-stx-price';
import { 
  getPriceOracleAuthority, 
  getContractSTXPrice, 
  getLastPriceUpdate,
  getCurrentBlockHeight 
} from '@/lib/contract';
import { formatPrice } from '@/lib/price-oracle';

export default function PriceOracleAdmin() {
  const { user, isConnected } = useWallet();
  const { 
    stxPrice,
    lastUpdated,
    isLoading: priceLoading,
    isDataAvailable
  } = useSTXPrice();
  
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [contractPrice, setContractPrice] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [currentBlock, setCurrentBlock] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Check if user is authorized to update prices
  useEffect(() => {
    const checkAuthorization = async () => {
      if (!isConnected || !user?.address) {
        setIsAuthorized(false);
        return;
      }

      try {
        setIsLoading(true);
        const [authority, contractPriceValue, lastUpdateBlock, currentBlockHeight] = await Promise.all([
          getPriceOracleAuthority(),
          getContractSTXPrice(),
          getLastPriceUpdate(),
          getCurrentBlockHeight(),
        ]);

        setIsAuthorized(authority === user.address);
        setContractPrice(contractPriceValue);
        setLastUpdate(lastUpdateBlock);
        setCurrentBlock(currentBlockHeight);
      } catch (err) {
        console.error('Error checking authorization:', err);
        setError('Failed to check authorization');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthorization();
  }, [isConnected, user?.address]);

  // Update contract price with current market price
  const updateContractPrice = async () => {
    if (!isConnected || !user || !isAuthorized) {
      setError('Not authorized to update prices');
      return;
    }

    if (!isDataAvailable || stxPrice <= 0) {
      setError('Invalid market price data');
      return;
    }

    setIsUpdating(true);
    setError('');
    setSuccess('');

    try {
      // Import Stacks Connect for transaction
      const { openContractCall } = await import('@stacks/connect');
      const { uintCV, PostConditionMode } = await import('@stacks/transactions');
      const { CONTRACT_CONFIG, getStacksNetwork } = await import('@/lib/stacks-config');
      
      // Convert price to 6 decimal precision for contract
      const priceWithPrecision = Math.round(stxPrice * 1000000);
      
      console.log('Updating contract price:', {
        marketPrice: stxPrice,
        contractPrice: priceWithPrecision,
        userAddress: user.address,
      });

      // Open contract call to update price
      await openContractCall({
        contractAddress: CONTRACT_CONFIG.address,
        contractName: CONTRACT_CONFIG.name,
        functionName: 'update-stx-price',
        functionArgs: [uintCV(priceWithPrecision)],
        postConditionMode: PostConditionMode.Allow,
        network: getStacksNetwork(),
        onFinish: (data) => {
          console.log('Price update transaction successful:', data);
          setSuccess(`Price update submitted! TX ID: ${data.txId}`);
          
          // Refresh contract data after a delay
          setTimeout(async () => {
            try {
              const [newContractPrice, newLastUpdate, newCurrentBlock] = await Promise.all([
                getContractSTXPrice(),
                getLastPriceUpdate(),
                getCurrentBlockHeight(),
              ]);
              setContractPrice(newContractPrice);
              setLastUpdate(newLastUpdate);
              setCurrentBlock(newCurrentBlock);
            } catch (err) {
              console.error('Error refreshing contract data:', err);
            }
          }, 5000);
        },
        onCancel: () => {
          console.log('Price update cancelled by user');
          setError('Price update was cancelled');
        },
      });
    } catch (err) {
      console.error('Price update error:', err);
      let errorMessage = 'Failed to update contract price';
      
      if (err instanceof Error) {
        errorMessage = err.message;
        
        if (err.message.includes('unauthorized')) {
          errorMessage = 'You are not authorized to update prices';
        } else if (err.message.includes('invalid')) {
          errorMessage = 'Invalid price value';
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  // Calculate price discrepancy (with safety checks)
  const priceDiscrepancy = (stxPrice && contractPrice) 
    ? Math.abs(stxPrice - contractPrice)
    : 0;
  const discrepancyPercentage = contractPrice > 0 ? (priceDiscrepancy / contractPrice) * 100 : 0;
  const needsUpdate = discrepancyPercentage > 5; // Update if more than 5% difference

  // Calculate blocks since last update
  const blocksSinceUpdate = currentBlock > lastUpdate ? currentBlock - lastUpdate : 0;
  const timeSinceUpdate = blocksSinceUpdate * 10; // Approximate minutes (10 min per block)

  if (!isConnected) {
    return (
      <div className="p-6 bg-gray-800 border border-gray-700 rounded-lg">
        <h2 className="text-xl font-semibold text-white mb-4">Price Oracle Admin</h2>
        <p className="text-gray-400">Connect your wallet to access price oracle controls</p>
      </div>
    );
  }

  if (!isDataAvailable) {
    return (
      <div className="p-6 bg-gray-800 border border-gray-700 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold text-white mb-4">Price Oracle Admin</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-400">Loading price data...</span>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 bg-gray-800 border border-gray-700 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold text-white mb-4">Price Oracle Admin</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-400">Loading authorization...</span>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="p-6 bg-yellow-900/20 border border-yellow-800 rounded-lg">
        <h2 className="text-xl font-semibold text-white mb-4">Price Oracle Admin</h2>
        <p className="text-yellow-200">
          You are not authorized to update contract prices. Only the price oracle authority can perform this action.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-800 border border-gray-700 rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold text-white mb-4">Price Oracle Admin</h2>
      
      {/* Price Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Market Price (Live)</h3>
          <div className="text-2xl font-bold text-blue-900">
            {formatPrice(stxPrice)}
          </div>
          <div className="text-xs text-blue-600 mt-1">
            Updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
        
        <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
          <h3 className="text-sm font-medium text-gray-200 mb-2">Contract Price (On-Chain)</h3>
          <div className="text-2xl font-bold text-white">
            {formatPrice(contractPrice)}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Block: {lastUpdate} ({timeSinceUpdate}m ago)
          </div>
        </div>
      </div>

      {/* Price Discrepancy Alert */}
      {needsUpdate && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-orange-800">Price Update Recommended</h3>
              <div className="mt-1 text-sm text-orange-700">
                Contract price differs by {discrepancyPercentage.toFixed(2)}% from market price
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Button */}
      <div className="mb-4">
        <button
          onClick={updateContractPrice}
          disabled={isUpdating || priceLoading}
          className={`w-full px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
            needsUpdate 
              ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500' 
              : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
          }`}
        >
          {isUpdating ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Updating Contract Price...
            </div>
          ) : (
            `Update Contract Price to ${formatPrice(stxPrice)}`
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      {/* Status Information */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Price Discrepancy:</span>
            <span className={`ml-2 font-medium ${needsUpdate ? 'text-orange-600' : 'text-green-600'}`}>
              {discrepancyPercentage.toFixed(2)}%
            </span>
          </div>
          <div>
            <span className="text-gray-500">Last Update:</span>
            <span className="ml-2 font-medium text-white">
              {timeSinceUpdate}m ago
            </span>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
          <p>• Contract prices should be updated when market price differs by more than 5%</p>
          <p>• Updates ensure minimum deposit requirements stay accurate</p>
          <p>• Only the price oracle authority can update contract prices</p>
        </div>
      </div>
    </div>
  );
}