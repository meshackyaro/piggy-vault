/**
 * Deposit Form Component
 * Handles STX deposits to StackIt with time-based lock duration selection
 * Updated to support the new contract's time-based lock periods instead of raw block counts
 */

'use client';

import { useState } from 'react';
import { useStacks } from '@/hooks/use-stacks';
import { getLockDurationOptions } from '@/lib/lock-options';

interface DepositFormProps {
  onDepositSuccess?: () => void;
}

export default function DepositForm({ onDepositSuccess }: DepositFormProps) {
  const { user, isConnected } = useStacks();
  const [amount, setAmount] = useState<string>('');
  const [selectedLockOption, setSelectedLockOption] = useState<number>(5); // Default to 1 day
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Get all available lock duration options
  const lockOptions = getLockDurationOptions();
  const selectedOption = lockOptions.find(opt => opt.value === selectedLockOption);

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

    // Validate lock option selection
    if (!selectedOption) {
      setError('Please select a valid lock duration');
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
      
      // Validate contract configuration
      if (!CONTRACT_CONFIG.address || !CONTRACT_CONFIG.name) {
        throw new Error('Contract configuration is missing. Please check your environment variables.');
      }
      
      // Always verify contract exists to provide better error messages
      const { verifyContractExists } = await import('@/lib/contract');
      const contractExists = await verifyContractExists();
      if (!contractExists) {
        throw new Error(`Contract ${CONTRACT_CONFIG.address}.${CONTRACT_CONFIG.name} not found on testnet. 
        
This is likely because:
1. The contract hasn't been deployed to testnet yet
2. The contract address in .env.local is incorrect
3. You're using a different network than expected

To fix this:
- Deploy the contract: clarinet deployments apply --testnet
- Or use devnet: clarinet devnet start
- Or check if the contract address is correct`);
      }

      // Validate and convert STX to microSTX for the contract call
      const { validateStxAmount, testStxConversion } = await import('@/lib/stacks-config');
      
      const validation = validateStxAmount(depositAmount);
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid amount');
      }
      
      const amountMicroStx = stxToMicroStx(depositAmount);
      const conversionTest = testStxConversion(depositAmount);
      
      console.log('Amount conversion test:', conversionTest);
      
      if (!conversionTest.isCorrect) {
        throw new Error(`Conversion error: ${depositAmount} STX -> ${amountMicroStx} microSTX (expected ${conversionTest.details.expectedMicroStx})`);
      }
      
      // Debug logging
      console.log('Deposit details:', {
        depositAmount,
        amountMicroStx,
        amountMicroStxString: amountMicroStx.toString(),
        selectedLockOption,
        contractAddress: CONTRACT_CONFIG.address,
        contractName: CONTRACT_CONFIG.name,
        userAddress: user?.address
      });
      
      // Validate amounts
      if (amountMicroStx <= 0) {
        throw new Error('Invalid amount: must be greater than 0');
      }
      
      if (amountMicroStx > 1000000000000) { // 1 million STX limit
        throw new Error('Amount too large: maximum 1,000,000 STX');
      }

      // Import network configuration
      const { getStacksNetwork } = await import('@/lib/stacks-config');
      const network = getStacksNetwork();
      
      console.log('Network configuration:', network);
      console.log('User details:', {
        userAddress: user?.address,
        isConnected
      });
      console.log('Transaction parameters:', {
        contractAddress: CONTRACT_CONFIG.address,
        contractName: CONTRACT_CONFIG.name,
        functionName: 'deposit',
        functionArgs: [amountMicroStx, selectedLockOption],
        network: network.chainId || 'unknown'
      });

      // Import post-condition mode to allow STX transfers
      const { PostConditionMode } = await import('@stacks/transactions');

      console.log('Setting up transaction with PostConditionMode.Allow to handle STX transfers');

      // Open contract call with Stacks Connect
      // Updated to include the lock option parameter and allow post-conditions for STX transfers
      await openContractCall({
        contractAddress: CONTRACT_CONFIG.address,
        contractName: CONTRACT_CONFIG.name,
        functionName: 'deposit',
        functionArgs: [
          uintCV(amountMicroStx),          // Amount in microSTX as number
          uintCV(selectedLockOption)       // Lock duration option (1-13)
        ],
        postConditionMode: PostConditionMode.Allow,  // Allow STX transfers without strict checking
        network: network,                   // Explicitly set network
        onFinish: (data) => {
          console.log('Transaction successful:', data);
          setSuccess(`Deposit transaction submitted! TX ID: ${data.txId}`);
          setAmount('');
          onDepositSuccess?.();
        },
        onCancel: () => {
          console.log('Transaction cancelled by user');
          setError('Transaction was cancelled');
        },
      });
    } catch (err) {
      console.error('Deposit error:', err);
      let errorMessage = 'Failed to submit deposit transaction';
      
      if (err instanceof Error) {
        errorMessage = err.message;
        
        // Provide more specific error messages
        if (err.message.includes('insufficient')) {
          errorMessage = 'Insufficient STX balance. Please check your wallet balance and try again.';
        } else if (err.message.includes('contract') || err.message.includes('not found')) {
          errorMessage = 'Contract not found. The StackIt contract may not be deployed to this network yet.';
        } else if (err.message.includes('invalid')) {
          errorMessage = 'Invalid transaction parameters. Please check the amount and try again.';
        }
      }
      
      setError(errorMessage);
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
      
      <form onSubmit={handleSubmit} className="space-y-6">
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

        {/* Lock Duration Selection */}
        <div>
          <label htmlFor="lockDuration" className="block text-sm font-medium text-gray-700 mb-2">
            Lock Duration
          </label>
          <select
            id="lockDuration"
            value={selectedLockOption}
            onChange={(e) => setSelectedLockOption(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          >
            {lockOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} - {option.description}
              </option>
            ))}
          </select>
          
          {/* Selected Option Details */}
          {selectedOption && (
            <div className="mt-2 p-2 bg-gray-50 rounded-md">
              <p className="text-xs text-gray-600">
                <span className="font-medium">Selected:</span> {selectedOption.label} 
                <span className="text-gray-500"> ({selectedOption.blocks} blocks ≈ {selectedOption.label.toLowerCase()})</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">{selectedOption.description}</p>
            </div>
          )}
        </div>

        {/* Lock Duration Categories */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {['short', 'medium', 'long'].map((category) => {
            const categoryOptions = lockOptions.filter(opt => opt.category === category);
            const categoryLabels = {
              short: 'Quick Locks',
              medium: 'Standard Locks', 
              long: 'Long-term Locks'
            };
            
            return (
              <div key={category} className="space-y-2">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {categoryLabels[category as keyof typeof categoryLabels]}
                </h4>
                <div className="grid grid-cols-2 gap-1">
                  {categoryOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedLockOption(option.value)}
                      className={`px-2 py-1 text-xs rounded border transition-colors ${
                        selectedLockOption === option.value
                          ? 'bg-blue-100 border-blue-300 text-blue-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                      disabled={isLoading}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
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
            `Deposit ${amount || '0'} STX for ${selectedOption?.label || 'selected duration'}`
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
        <h4 className="text-sm font-medium text-blue-800 mb-1">How Lock Durations Work:</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Choose from predefined time periods (1 hour to 1 year)</li>
          <li>• Funds are locked and cannot be withdrawn until the period expires</li>
          <li>• Lock periods are based on Stacks block time (~10 minutes per block)</li>
          <li>• Minimum deposit is 0.000001 STX</li>
        </ul>
      </div>
    </div>
  );
}