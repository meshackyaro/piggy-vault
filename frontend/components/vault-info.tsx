/**
 * Vault Information Component
 * Displays user's vault balance, deposit info, and lock status
 */

'use client';

import { useState, useEffect } from 'react';
import { useStacks } from '@/hooks/use-stacks';
import { getUserDeposit, getUserBalance, canWithdraw } from '@/lib/contract';
import type { DepositInfo } from '@/lib/contract';

export default function VaultInfo() {
  const { user, isConnected } = useStacks();
  const [depositInfo, setDepositInfo] = useState<DepositInfo>({ amount: 0, depositBlock: 0 });
  const [balance, setBalance] = useState<number>(0);
  const [currentBlock, setCurrentBlock] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Fetch user's vault information when wallet is connected
  useEffect(() => {
    if (!isConnected || !user) return;

    const fetchVaultInfo = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        // Fetch deposit info and balance in parallel
        const [deposit, userBalance] = await Promise.all([
          getUserDeposit(user.address),
          getUserBalance(user.address),
        ]);

        setDepositInfo(deposit);
        setBalance(userBalance);

        // Mock current block height - in production, fetch from Stacks API
        setCurrentBlock(deposit.depositBlock + 25); // Simulate some blocks have passed
      } catch (err) {
        setError('Failed to fetch vault information');
        console.error('Error fetching vault info:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVaultInfo();
  }, [isConnected, user]);

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

  const lockPeriod = 50; // Default lock period from contract
  const blocksRemaining = Math.max(0, lockPeriod - (currentBlock - depositInfo.depositBlock));
  const isUnlocked = canWithdraw(depositInfo.depositBlock, currentBlock, lockPeriod);

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Vault</h2>
      
      {/* Balance Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-1">Total Balance</h3>
          <p className="text-2xl font-bold text-blue-900">{balance.toFixed(6)} STX</p>
        </div>
        
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-800 mb-1">Deposit Block</h3>
          <p className="text-lg font-semibold text-gray-900">
            {depositInfo.depositBlock > 0 ? depositInfo.depositBlock : 'No deposit'}
          </p>
        </div>
      </div>

      {/* Lock Status */}
      {depositInfo.amount > 0 && (
        <div className="mb-4">
          <div className={`p-4 rounded-lg ${isUnlocked ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-sm font-medium ${isUnlocked ? 'text-green-800' : 'text-yellow-800'}`}>
                  Lock Status
                </h3>
                <p className={`text-lg font-semibold ${isUnlocked ? 'text-green-900' : 'text-yellow-900'}`}>
                  {isUnlocked ? 'Unlocked - Ready to withdraw' : `Locked for ${blocksRemaining} more blocks`}
                </p>
              </div>
              <div className={`w-3 h-3 rounded-full ${isUnlocked ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            </div>
          </div>
        </div>
      )}

      {/* No Deposit State */}
      {depositInfo.amount === 0 && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
          <p className="text-gray-600">No deposits found. Make your first deposit to get started!</p>
        </div>
      )}

      {/* Vault Details */}
      <div className="text-sm text-gray-500 space-y-1">
        <p>Lock Period: {lockPeriod} blocks</p>
        <p>Current Block: {currentBlock}</p>
        {depositInfo.depositBlock > 0 && (
          <p>Blocks Elapsed: {currentBlock - depositInfo.depositBlock}</p>
        )}
      </div>
    </div>
  );
}