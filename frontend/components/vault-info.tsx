/**
 * Vault Information Component
 * Displays user's vault balance, deposit info, and time-based lock status
 * Updated to support the new contract's time-based lock periods
 */

'use client';

import { useState, useEffect } from 'react';
import { useStacks } from '@/hooks/use-stacks';
import { getUserDeposit, getUserBalance } from '@/lib/contract';
import { formatRemainingTime, convertOptionToLabel, getUnlockTimeDescription } from '@/lib/lock-options';
import type { DepositInfo } from '@/lib/contract';

// Extended deposit info to include lock option and expiry
interface ExtendedDepositInfo extends DepositInfo {
  lockExpiry?: number;
  lockOption?: number;
}

interface VaultInfoProps {
  refreshTrigger?: number;
  onRefresh?: () => void;
}

export default function VaultInfo({ refreshTrigger, onRefresh }: VaultInfoProps = {}) {
  const { user, isConnected } = useStacks();
  const [depositInfo, setDepositInfo] = useState<ExtendedDepositInfo>({ 
    amount: 0, 
    depositBlock: 0,
    lockExpiry: 0,
    lockOption: 0
  });
  const [balance, setBalance] = useState<number>(0);
  const [currentBlock, setCurrentBlock] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Fetch user's vault information when wallet is connected
  useEffect(() => {
    if (!isConnected || !user) return;

    const fetchVaultInfo = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        console.log('🔍 Fetching vault info for user:', user.address);
        console.log('📋 Contract config:', { 
          address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS, 
          name: process.env.NEXT_PUBLIC_CONTRACT_NAME 
        });
        
        // Import contract functions dynamically to avoid SSR issues
        const { getCurrentBlockHeight, getLockExpiry, validateContractConfig } = await import('@/lib/contract');
        
        // Validate contract configuration before making calls
        if (!validateContractConfig()) {
          throw new Error('Contract configuration is invalid. Please check your environment variables.');
        }
        
        console.log('✅ Contract config validated');
        
        // Fetch all data in parallel
        console.log('📡 Fetching data from contract...');
        const [deposit, userBalance, currentBlockHeight, lockExpiry] = await Promise.all([
          getUserDeposit(user.address),
          getUserBalance(user.address),
          getCurrentBlockHeight(),
          getLockExpiry(user.address),
        ]);

        console.log('📊 Fetched data:', { deposit, userBalance, currentBlockHeight, lockExpiry });

        // Calculate lock option from remaining blocks and deposit info
        // This is an approximation since we don't store the original lock option
        let lockOption = 0;
        if (lockExpiry > 0 && deposit.depositBlock > 0) {
          const totalLockBlocks = lockExpiry - deposit.depositBlock;
          // Map block counts back to lock options (approximate)
          const lockOptionsMap: Record<number, number> = {
            6: 1,     // 1 hour
            18: 2,    // 3 hours
            36: 3,    // 6 hours
            48: 4,    // 8 hours
            144: 5,   // 1 day
            720: 6,   // 5 days
            1008: 7,  // 1 week
            2016: 8,  // 2 weeks
            4320: 9,  // 1 month
            12960: 10, // 3 months
            25920: 11, // 6 months
            38880: 12, // 9 months
            52560: 13, // 1 year
          };
          lockOption = lockOptionsMap[totalLockBlocks] || 0;
        }
        
        setDepositInfo({
          ...deposit,
          lockExpiry: lockExpiry || deposit.lockExpiry,
          lockOption,
        });
        setBalance(userBalance);
        setCurrentBlock(currentBlockHeight);
        setLastRefresh(new Date());
        
        console.log('✅ Vault info updated successfully');
      } catch (err) {
        const { handleContractError } = await import('@/lib/contract');
        const errorMessage = handleContractError(err);
        setError(errorMessage);
        console.error('❌ Error fetching vault info:', err);
        console.error('❌ Error message:', errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVaultInfo();
    
    // Set up polling to update data every 30 seconds
    const interval = setInterval(fetchVaultInfo, 30000);
    
    return () => clearInterval(interval);
  }, [isConnected, user, refreshTrigger]);

  // Manual refresh function
  const handleManualRefresh = async () => {
    if (!isConnected || !user || isLoading) return;
    
    console.log('🔄 Manual refresh triggered');
    const fetchVaultInfo = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        console.log('🔍 Fetching vault info for user:', user.address);
        
        const { getCurrentBlockHeight, getLockExpiry, validateContractConfig } = await import('@/lib/contract');
        
        if (!validateContractConfig()) {
          throw new Error('Contract configuration is invalid. Please check your environment variables.');
        }
        
        const [deposit, userBalance, currentBlockHeight, lockExpiry] = await Promise.all([
          getUserDeposit(user.address),
          getUserBalance(user.address),
          getCurrentBlockHeight(),
          getLockExpiry(user.address),
        ]);

        console.log('📊 Manual refresh data:', { deposit, userBalance, currentBlockHeight, lockExpiry });

        let lockOption = 0;
        if (lockExpiry > 0 && deposit.depositBlock > 0) {
          const totalLockBlocks = lockExpiry - deposit.depositBlock;
          const lockOptionsMap: Record<number, number> = {
            6: 1, 18: 2, 36: 3, 48: 4, 144: 5, 720: 6, 1008: 7, 
            2016: 8, 4320: 9, 12960: 10, 25920: 11, 38880: 12, 52560: 13,
          };
          lockOption = lockOptionsMap[totalLockBlocks] || 0;
        }
        
        setDepositInfo({
          ...deposit,
          lockExpiry: lockExpiry || deposit.lockExpiry,
          lockOption,
        });
        setBalance(userBalance);
        setCurrentBlock(currentBlockHeight);
        setLastRefresh(new Date());
        
        if (onRefresh) onRefresh();
        
        console.log('✅ Manual refresh completed successfully');
      } catch (err) {
        const { handleContractError } = await import('@/lib/contract');
        const errorMessage = handleContractError(err);
        setError(errorMessage);
        console.error('❌ Manual refresh error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    await fetchVaultInfo();
  };

  // Don't render if wallet not connected
  if (!isConnected || !user) {
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  // Calculate lock status using time-based system
  const blocksRemaining = Math.max(0, (depositInfo.lockExpiry || 0) - currentBlock);
  const isUnlocked = currentBlock >= (depositInfo.lockExpiry || 0);
  const lockDurationLabel = depositInfo.lockOption ? convertOptionToLabel(depositInfo.lockOption) : 'Unknown';
  const remainingTimeText = formatRemainingTime(blocksRemaining);

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Your Vault</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={handleManualRefresh}
            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>
      
      {/* Balance Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-1">Total Balance</h3>
          <p className="text-2xl font-bold text-blue-900">{balance.toFixed(6)} STX</p>
        </div>
        
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-800 mb-1">Lock Duration</h3>
          <p className="text-lg font-semibold text-gray-900">
            {depositInfo.lockOption ? lockDurationLabel : 'No active lock'}
          </p>
        </div>

        <div className="p-4 bg-purple-50 rounded-lg">
          <h3 className="text-sm font-medium text-purple-800 mb-1">Unlock Time</h3>
          <p className="text-lg font-semibold text-purple-900">
            {depositInfo.amount > 0 ? getUnlockTimeDescription(depositInfo.lockExpiry || 0, currentBlock) : 'No deposit'}
          </p>
        </div>
      </div>

      {/* Lock Status */}
      {depositInfo.amount > 0 && (
        <div className="mb-4">
          <div className={`p-4 rounded-lg ${isUnlocked ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className={`text-sm font-medium ${isUnlocked ? 'text-green-800' : 'text-yellow-800'}`}>
                  Lock Status
                </h3>
                <p className={`text-lg font-semibold ${isUnlocked ? 'text-green-900' : 'text-yellow-900'}`}>
                  {isUnlocked ? 'Unlocked - Ready to withdraw' : `Locked for ${remainingTimeText}`}
                </p>
                {!isUnlocked && (
                  <p className={`text-xs ${isUnlocked ? 'text-green-700' : 'text-yellow-700'} mt-1`}>
                    Time remaining: {remainingTimeText}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full ${isUnlocked ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                {!isUnlocked && (
                  <div className="mt-2 text-xs text-gray-500">
                    {Math.round((1 - blocksRemaining / ((depositInfo.lockExpiry || 0) - depositInfo.depositBlock)) * 100)}%
                  </div>
                )}
              </div>
            </div>
            
            {/* Progress Bar for Locked Funds */}
            {!isUnlocked && depositInfo.lockExpiry && depositInfo.depositBlock && (
              <div className="mt-3">
                <div className="w-full bg-yellow-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(0, Math.min(100, 
                        ((currentBlock - depositInfo.depositBlock) / (depositInfo.lockExpiry - depositInfo.depositBlock)) * 100
                      ))}%`
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-yellow-700 mt-1">
                  <span>Deposited</span>
                  <span>Unlocks</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No Deposit State */}
      {depositInfo.amount === 0 && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
          <p className="text-gray-600">No deposits found. Make your first deposit to get started!</p>
        </div>
      )}

      {/* Vault Details - Time-focused */}
      {depositInfo.amount > 0 && (
        <div className="border-t pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-3">
              <div>
                <p className="font-medium text-gray-700">Lock Duration:</p>
                <p className="text-gray-900">{lockDurationLabel}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Time Elapsed:</p>
                <p className="text-gray-900">{formatRemainingTime(currentBlock - depositInfo.depositBlock)}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="font-medium text-gray-700">Status:</p>
                <p className={`font-medium ${isUnlocked ? 'text-green-600' : 'text-yellow-600'}`}>
                  {isUnlocked ? 'Ready to withdraw' : `Locked for ${remainingTimeText}`}
                </p>
              </div>
              {!isUnlocked && (
                <div>
                  <p className="font-medium text-gray-700">Progress:</p>
                  <p className="text-gray-900">
                    {Math.round((1 - blocksRemaining / ((depositInfo.lockExpiry || 0) - depositInfo.depositBlock)) * 100)}% complete
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Technical Details - Collapsible (optional for advanced users) */}
          <details className="mt-4">
            <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 select-none flex items-center gap-1">
              <span>⚙️</span>
              <span>Blockchain Details</span>
            </summary>
            <div className="mt-2 p-3 bg-gray-50 rounded text-xs text-gray-600">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-medium">Deposit Block:</span> {depositInfo.depositBlock}
                </div>
                <div>
                  <span className="font-medium">Current Block:</span> {currentBlock}
                </div>
                <div>
                  <span className="font-medium">Lock Expiry Block:</span> {depositInfo.lockExpiry}
                </div>
                <div>
                  <span className="font-medium">Blocks Remaining:</span> {blocksRemaining}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 italic">
                * Stacks blocks are mined approximately every 10 minutes
              </p>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}