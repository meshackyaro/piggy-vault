/**
 * Price Sync Status Component
 * Shows the synchronization status between market price and contract minimum deposit
 */

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { useSTXPrice } from '@/hooks/use-stx-price';
import { 
  isContractPriceInSync, 
  updateContractSTXPrice,
  getContractSTXPrice,
  getContractMinimumDeposit,
  isContractMinimumInSync,
  updateContractMinimumDeposit,
} from '@/lib/contract-price-sync';

interface SyncStatus {
  inSync: boolean;
  contractMinimum: number;
  marketMinimum: number;
  difference: number;
}

export default function PriceSyncStatus() {
  const { isConnected } = useWallet();
  const { formatSTX, formatUSDPrice, minimumUSD, isDataAvailable } = useSTXPrice();
  
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string>('');
  const [updateError, setUpdateError] = useState<string>('');

  // Check sync status
  const checkSyncStatus = async () => {
    if (!isDataAvailable) return;
    
    setIsLoading(true);
    try {
      const status = await isContractMinimumInSync();
      setSyncStatus(status);
      setLastCheck(new Date());
    } catch (error) {
      console.error('Failed to check sync status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update contract minimum
  const handleUpdateContract = async () => {
    if (!isConnected) {
      setUpdateError('Please connect your wallet to update the contract');
      return;
    }

    setIsUpdating(true);
    setUpdateError('');
    setUpdateSuccess('');

    try {
      const txId = await updateContractMinimumDeposit();
      setUpdateSuccess(`Contract updated successfully! Transaction ID: ${txId}`);
      
      // Refresh sync status after a delay
      setTimeout(checkSyncStatus, 2000);
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : 'Failed to update contract');
    } finally {
      setIsUpdating(false);
    }
  };

  // Initial check and periodic updates
  useEffect(() => {
    if (isDataAvailable) {
      checkSyncStatus();
      
      // Check every 5 minutes
      const interval = setInterval(checkSyncStatus, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isDataAvailable]);

  if (!isDataAvailable) {
    return null;
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-sm font-medium text-white">Contract Sync Status</h3>
          <p className="text-xs text-gray-400">
            Market price vs contract minimum deposit
          </p>
        </div>
        <button
          onClick={checkSyncStatus}
          disabled={isLoading}
          className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
        >
          {isLoading ? 'Checking...' : 'Refresh'}
        </button>
      </div>

      {isLoading && !syncStatus ? (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-sm text-gray-400">Checking sync status...</span>
        </div>
      ) : syncStatus ? (
        <div className="space-y-3">
          {/* Sync Status Indicator */}
          <div className={`flex items-center p-3 rounded-md ${
            syncStatus.inSync 
              ? 'bg-green-900/20 border border-green-800' 
              : 'bg-yellow-900/20 border border-yellow-800'
          }`}>
            <div className={`flex-shrink-0 w-2 h-2 rounded-full mr-3 ${
              syncStatus.inSync ? 'bg-green-500' : 'bg-yellow-500'
            }`}></div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                syncStatus.inSync ? 'text-green-200' : 'text-yellow-200'
              }`}>
                {syncStatus.inSync ? 'In Sync' : 'Out of Sync'}
              </p>
              <p className={`text-xs ${
                syncStatus.inSync ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'
              }`}>
                {syncStatus.inSync 
                  ? 'Contract minimum is aligned with market price'
                  : `Contract needs update (${formatSTX(syncStatus.difference)} STX difference)`
                }
              </p>
            </div>
          </div>

          {/* Detailed Information */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-gray-400">Market Minimum:</p>
              <p className="font-medium">{formatSTX(syncStatus.marketMinimum)} STX</p>
              <p className="text-gray-400">({formatUSDPrice(minimumUSD)})</p>
            </div>
            <div>
              <p className="text-gray-400">Contract Minimum:</p>
              <p className="font-medium">{formatSTX(syncStatus.contractMinimum)} STX</p>
            </div>
          </div>

          {/* Update Button */}
          {!syncStatus.inSync && (
            <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={handleUpdateContract}
                disabled={isUpdating || !isConnected}
                className="w-full flex justify-center py-2 px-3 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                    Updating Contract...
                  </div>
                ) : (
                  'Update Contract Minimum'
                )}
              </button>
              
              {!isConnected && (
                <p className="text-xs text-gray-400 text-center mt-1">
                  Connect wallet to update contract
                </p>
              )}
            </div>
          )}

          {/* Success/Error Messages */}
          {updateSuccess && (
            <div className="bg-green-900/20 border border-green-800 rounded-md p-2">
              <p className="text-xs text-green-200">{updateSuccess}</p>
            </div>
          )}
          
          {updateError && (
            <div className="bg-red-900/20 border border-red-800 rounded-md p-2">
              <p className="text-xs text-red-200">{updateError}</p>
            </div>
          )}

          {/* Last Check Time */}
          {lastCheck && (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
              Last checked: {lastCheck.toLocaleTimeString()}
            </p>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-gray-400">Unable to check sync status</p>
        </div>
      )}
    </div>
  );
}