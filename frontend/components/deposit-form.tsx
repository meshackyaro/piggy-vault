/**
 * Deposit Form Component
 * Handles STX deposits to SafeStack with time-based lock duration selection and $2 USD minimum enforcement
 * Updated to support the new contract's time-based lock periods and dynamic minimum deposit validation
 */

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { getLockDurationOptions } from '@/lib/lock-options';
import { useSTXPrice } from '@/hooks/use-stx-price';
import { formatPrice, formatSTXAmount } from '@/lib/price-oracle';

interface DepositFormProps {
  onDepositSuccess?: () => void;
}

export default function DepositForm({ onDepositSuccess }: DepositFormProps) {
  const { user, isConnected } = useWallet();
  const [amount, setAmount] = useState<string>('');
  const [selectedLockOption, setSelectedLockOption] = useState<number>(5); // Default to 1 day
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Get real-time price data and minimum deposit requirements
  const { 
    stxPrice,
    minimumSTX,
    lastUpdated,
    isLoading: priceLoading,
    error: priceError,
    validateDeposit, 
    calculateUSDValue, 
    formatUSDPrice, 
    formatSTX,
    isDataAvailable
  } = useSTXPrice();

  // Get all available lock duration options
  const lockOptions = getLockDurationOptions();
  const selectedOption = lockOptions.find(opt => opt.value === selectedLockOption);

  // Calculate USD value and validation for current amount
  const depositAmount = parseFloat(amount) || 0;
  const usdValue = calculateUSDValue(depositAmount);
  const isAmountValid = depositAmount >= minimumSTX;
  const isAmountEntered = depositAmount > 0;

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

    // Validate minimum deposit requirement ($2 USD equivalent)
    if (depositAmount < minimumSTX) {
      setError(`Minimum deposit is ${formatSTX(minimumSTX)} STX (${formatUSDPrice(2.0)} USD equivalent)`);
      return;
    }

    // Additional validation with contract
    const validation = await validateDeposit(depositAmount);
    if (!validation.isValid) {
      setError(`Deposit does not meet minimum requirement. Required: ${formatSTX(validation.minimumRequired)} STX`);
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
          errorMessage = 'Contract not found. The SafeStack contract may not be deployed to this network yet.';
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
      <div className="p-6 bg-gray-800 border border-gray-200 rounded-lg">
        <h2 className="text-xl font-semibold text-white mb-4">Deposit STX</h2>
        <p className="text-gray-400">Connect your wallet to make deposits</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-800 border border-gray-700 rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold text-white mb-4">Deposit STX</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Amount Input */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-2">
            Amount (STX)
          </label>
          <div className="relative">
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Min: ${formatSTX(minimumSTX)}`}
              step="0.000001"
              min={minimumSTX}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                isAmountEntered && !isAmountValid 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <span className="text-gray-500 text-sm">STX</span>
            </div>
          </div>
          
          {/* Real-time validation feedback */}
          <div className="mt-2 space-y-1">
            {/* Current price info */}
            <div className="flex justify-between text-xs text-gray-400">
              <span>STX Price: {formatUSDPrice(stxPrice)}</span>
              <span>Min Required: {formatSTX(minimumSTX)} STX</span>
            </div>
            
            {/* USD value display */}
            {isAmountEntered && (
              <div className={`text-sm ${isAmountValid ? 'text-green-600' : 'text-red-600'}`}>
                USD Value: {formatUSDPrice(usdValue)}
                {!isAmountValid && (
                  <span className="ml-2 text-red-500">
                    (Below ${formatUSDPrice(2.0)} minimum)
                  </span>
                )}
              </div>
            )}
            
            {/* Price update status */}
            {priceLoading && (
              <div className="text-xs text-blue-600 flex items-center">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                Updating prices...
              </div>
            )}
            
            {priceError && (
              <div className="text-xs text-red-600">
                Price update error: {priceError}
              </div>
            )}
          </div>
        </div>

        {/* Lock Duration Selection */}
        <div>
          <label htmlFor="lockDuration" className="block text-sm font-medium text-gray-300 mb-2">
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
            <div className="mt-2 p-2 bg-gray-800 rounded-md">
              <p className="text-xs text-gray-400">
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
                          ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
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
          disabled={isLoading || !amount || !isAmountValid || priceLoading}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </div>
          ) : priceLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Loading prices...
            </div>
          ) : !isAmountValid && isAmountEntered ? (
            `Minimum ${formatSTX(minimumSTX)} STX Required`
          ) : (
            `Deposit ${amount || '0'} STX (${formatUSDPrice(usdValue)}) for ${selectedOption?.label || 'selected duration'}`
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
        <h4 className="text-sm font-medium text-blue-800 mb-1">Deposit Requirements:</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Minimum deposit: {formatUSDPrice(2.0)} USD equivalent ({formatSTX(minimumSTX)} STX)</li>
          <li>• Prices update automatically every 15 seconds</li>
          <li>• Choose from predefined time periods (1 hour to 1 year)</li>
          <li>• Funds are locked and cannot be withdrawn until the period expires</li>
          <li>• Lock periods are based on Stacks block time (~10 minutes per block)</li>
        </ul>
        
        {/* Price update info */}
        <div className="mt-2 pt-2 border-t border-blue-200">
          <div className="flex justify-between text-xs text-blue-600">
            <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
            <span>STX: {formatUSDPrice(stxPrice)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}