/**
 * Withdraw Form Component
 * Handles STX withdrawals from the piggy vault with lock period validation
 */

'use client';

import { useState, useEffect } from 'react';
import { useStacks } from '@/hooks/use-stacks';
import { getUserDeposit, canWithdraw } from '@/lib/contract';
import type { DepositInfo } from '@/lib/contract';

interface WithdrawFormProps {
  onWithdrawSuccess?: () => void;
}

export default function WithdrawForm({ onWithdrawSuccess }: WithdrawFormProps) {
  const { user, isConnected } = useStacks();
  const [amount, setAmount] = useState<string>('');
  const [depositInfo, setDepositInfo] = useState<DepositInfo>({ amount: 0, depositBlock: 0 });
  const [currentBlock, setCurrentBlock] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Fetch user deposit info when component mounts or user changes
  useEffect(() => {
    if (!isConnected || !user) return;

    const fetchDepositInfo = async () => {
      setIsLoadingInfo(true);
      try {
        const deposit = await getUserDeposit(user.address);
        setDepositInfo(deposit);
        
        // Mock current block height - in production, fetch from Stacks API
        setCurrentBlock(deposit.depositBlock + 25); // Simulate some blocks have passed
      } catch (err) {
        console.error('Error fetching deposit info:', err);
      } finally {
        setIsLoadingInfo(false);
      }
    };

    fetchDepositInfo();
  }, [isConnected, user]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !user) {
      setError('Please connect your wallet first');
      return;
    }

    const withdrawAmount = parseFloat(amount);
    
    // Validate amount
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    if (withdrawAmount > depositInfo.amount) {
      setError(`Cannot withdraw more than your balance (${depositInfo.amount.toFixed(6)} STX)`);
      return;
    }

    // Check if lock period has passed
    const lockPeriod = 50;
    if (!canWithdraw(depositInfo.depositBlock, currentBlock, lockPeriod)) {
      const blocksRemaining = lockPeriod - (currentBlock - depositInfo.depositBlock);
      setError(`Funds are still locked for ${blocksRemaining} more blocks`);
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // Import Stacks Connect for transaction
      const { openContractCall } = await import('@stacks/connect');
      const { uintCV } = await import('@stacks/transactions');
      const { CONTRACT_CONFIG, stxToMicroStx } = await import('@/lib/stacks-config');

      // Convert STX to microSTX for the contract call
      const amountMicroStx = stxToMicroStx(withdrawAmount);

      // Open contract call with Stacks Connect
      await openContractCall({
        contractAddress: CONTRACT_CONFIG.address,
        contractName: CONTRACT_CONFIG.name,
        functionName: 'withdraw',
        functionArgs: [uintCV(amountMicroStx)],
        onFinish: (data) => {
          setSuccess(`Withdrawal transaction submitted! TX ID: ${data.txId}`);
          setAmount('');
          onWithdrawSuccess?.();
        },
        onCancel: () => {
          setError('Transaction was cancelled');
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit withdrawal transaction');
    } finally {
      setIsLoading(false);
    }
  };

  // Set max amount to user's balance
  const handleMaxClick = () => {
    setAmount(depositInfo.amount.toString());
  };

  // Don't render if wallet not connected
  if (!isConnected) {
    return (
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Withdraw STX</h2>
        <p className="text-gray-600">Connect your wallet to make withdrawals</p>
      </div>
    );
  }

  // Show loading state while fetching deposit info
  if (isLoadingInfo) {
    return (
      <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Withdraw STX</h2>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const lockPeriod = 50;
  const isUnlocked = canWithdraw(depositInfo.depositBlock, currentBlock, lockPeriod);
  const blocksRemaining = Math.max(0, lockPeriod - (currentBlock - depositInfo.depositBlock));

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Withdraw STX</h2>
      
      {/* No Deposit State */}
      {depositInfo.amount === 0 && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
          <p className="text-gray-600">No deposits found. Make a deposit first to withdraw funds.</p>
        </div>
      )}

      {/* Locked State */}
      {depositInfo.amount > 0 && !isUnlocked && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-sm font-medium text-yellow-800 mb-1">Funds Still Locked</h3>
          <p className="text-sm text-yellow-700">
            Your funds are locked for {blocksRemaining} more blocks. 
            You can withdraw after block {depositInfo.depositBlock + lockPeriod}.
          </p>
        </div>
      )}

      {/* Withdrawal Form - Only show if user has unlocked funds */}
      {depositInfo.amount > 0 && isUnlocked && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Available Balance */}
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700">
              Available to withdraw: <span className="font-semibold">{depositInfo.amount.toFixed(6)} STX</span>
            </p>
          </div>

          {/* Amount Input */}
          <div>
            <label htmlFor="withdraw-amount" className="block text-sm font-medium text-gray-700 mb-2">
              Amount (STX)
            </label>
            <div className="relative">
              <input
                type="number"
                id="withdraw-amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.000000"
                step="0.000001"
                min="0.000001"
                max={depositInfo.amount}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                disabled={isLoading}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <button
                  type="button"
                  onClick={handleMaxClick}
                  className="text-xs text-blue-600 hover:text-blue-800 mr-2"
                  disabled={isLoading}
                >
                  MAX
                </button>
                <span className="text-gray-500 text-sm">STX</span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !amount}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </div>
            ) : (
              'Withdraw STX'
            )}
          </button>
        </form>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      {/* Info Box */}
      {depositInfo.amount > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="text-sm font-medium text-blue-800 mb-1">Withdrawal Info:</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Lock period: {lockPeriod} blocks</li>
            <li>• Deposit block: {depositInfo.depositBlock}</li>
            <li>• Current block: {currentBlock}</li>
            <li>• Status: {isUnlocked ? 'Unlocked ✓' : `Locked for ${blocksRemaining} blocks`}</li>
          </ul>
        </div>
      )}
    </div>
  );
}