/**
 * Deposit Form Component
 * Handles STX deposits to the piggy vault with validation and transaction feedback
 */

'use client';

import { useState } from 'react';
import { useStacks } from '@/hooks/use-stacks';

interface DepositFormProps {
  onDepositSuccess?: () => void;
}

export default function DepositForm({ onDepositSuccess }: DepositFormProps) {
  const { user, isConnected, userSession } = useStacks();
  const [amount, setAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !user) {
      setError('Please connect your wallet first');
      return;
    }

    const depositAmount = parseFloat(amount);
    
    // Validate amount
    if (isNaN(depositAmount) || depositAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    if (depositAmount < 0.000001) {
      setError('Minimum deposit is 0.000001 STX');
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
      const amountMicroStx = stxToMicroStx(depositAmount);

      // Open contract call with Stacks Connect
      await openContractCall({
        contractAddress: CONTRACT_CONFIG.address,
        contractName: CONTRACT_CONFIG.name,
        functionName: 'deposit',
        functionArgs: [uintCV(amountMicroStx)],
        onFinish: (data) => {
          setSuccess(`Deposit transaction submitted! TX ID: ${data.txId}`);
          setAmount('');
          onDepositSuccess?.();
        },
        onCancel: () => {
          setError('Transaction was cancelled');
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit deposit transaction');
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if wallet not connected
  if (!isConnected) {
    return (
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Deposit STX</h2>
        <p className="text-gray-600">Connect your wallet to make deposits</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Deposit STX</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Amount Input */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
            Amount (STX)
          </label>
          <div className="relative">
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.000000"
              step="0.000001"
              min="0.000001"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <span className="text-gray-500 text-sm">STX</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !amount}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </div>
          ) : (
            'Deposit STX'
          )}
        </button>
      </form>

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
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <h4 className="text-sm font-medium text-blue-800 mb-1">Important Notes:</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Deposits are locked for 50 blocks (~8.3 hours)</li>
          <li>• You cannot withdraw until the lock period expires</li>
          <li>• Minimum deposit is 0.000001 STX</li>
        </ul>
      </div>
    </div>
  );
}