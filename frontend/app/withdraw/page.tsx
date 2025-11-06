/**
 * Withdraw Page - STX withdrawal interface
 */

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { getUserDeposit, getUserBalance } from '@/lib/contract';

interface DepositInfo {
  amount: number;
  depositBlock: number;
  lockExpiry: number;
}

export default function WithdrawPage() {
  const { user, isConnected } = useWallet();
  const [depositInfo, setDepositInfo] = useState<DepositInfo>({ 
    amount: 0, 
    depositBlock: 0,
    lockExpiry: 0
  });
  const [balance, setBalance] = useState<number>(0);
  const [currentBlock, setCurrentBlock] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Reset state when wallet disconnects or changes
  useEffect(() => {
    if (!isConnected || !user) {
      setDepositInfo({ amount: 0, depositBlock: 0, lockExpiry: 0 });
      setBalance(0);
      setCurrentBlock(0);
      setError('');
      setSuccess('');
      setIsLoading(false);
      return;
    }
  }, [isConnected, user?.address]);

  // Fetch user's deposit information
  useEffect(() => {
    if (!isConnected || !user) return;

    const fetchDepositInfo = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        const { getCurrentBlockHeight, getLockExpiry, validateContractConfig } = await import('@/lib/contract');
        
        if (!validateContractConfig()) {
          throw new Error('Contract configuration is invalid.');
        }
        
        const [deposit, userBalance, currentBlockHeight, lockExpiry] = await Promise.all([
          getUserDeposit(user.address),
          getUserBalance(user.address),
          getCurrentBlockHeight(),
          getLockExpiry(user.address),
        ]);

        setDepositInfo({
          ...deposit,
          lockExpiry: lockExpiry ?? deposit.lockExpiry ?? 0,
        });
        setBalance(userBalance);
        setCurrentBlock(currentBlockHeight);
      } catch (err) {
        const { handleContractError } = await import('@/lib/contract');
        const errorMessage = handleContractError(err);
        setError(errorMessage);
        console.error('Error fetching deposit info:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDepositInfo();
  }, [isConnected, user?.address]); // Use user.address to detect wallet changes

  // Handle withdrawal
  const handleWithdraw = async () => {
    if (!isConnected || !user) {
      setError('Please connect your wallet first');
      return;
    }

    if (!hasDeposit) {
      setError('No deposit found to withdraw');
      return;
    }

    if (isLocked) {
      setError('Deposit is still locked. Please wait until the lock period expires.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const { openContractCall } = await import('@stacks/connect');
      const { 
        PostConditionMode, 
        uintCV
      } = await import('@stacks/transactions');
      const { CONTRACT_CONFIG, getStacksNetwork, stxToMicroStx } = await import('@/lib/stacks-config');
      
      if (!CONTRACT_CONFIG.address || !CONTRACT_CONFIG.name) {
        throw new Error('Contract configuration is missing.');
      }

      const network = getStacksNetwork();
      const withdrawAmountMicroStx = stxToMicroStx(depositInfo.amount);

      console.log('Initiating withdrawal:', {
        amount: depositInfo.amount,
        amountMicroStx: withdrawAmountMicroStx,
        contract: `${CONTRACT_CONFIG.address}.${CONTRACT_CONFIG.name}`,
        network: network,
        userAddress: user.address,
        isLocked: isLocked,
        currentBlock: currentBlock,
        lockExpiry: depositInfo.lockExpiry
      });

      await openContractCall({
        contractAddress: CONTRACT_CONFIG.address,
        contractName: CONTRACT_CONFIG.name,
        functionName: 'withdraw',
        functionArgs: [uintCV(withdrawAmountMicroStx)], // Pass the amount to withdraw
        postConditionMode: PostConditionMode.Allow, // Use Allow mode to avoid post-condition issues for now
        network: network,
        onFinish: (data) => {
          console.log('Withdrawal transaction submitted successfully:', data);
          setSuccess(`Withdrawal transaction submitted successfully! TX ID: ${data.txId}`);
          setError(''); // Clear any previous errors
          
          // Show success message and redirect after delay
          setTimeout(() => {
            window.location.href = '/'; // Redirect to dashboard
          }, 3000);
        },
        onCancel: () => {
          console.log('Transaction cancelled by user');
          setError('Transaction was cancelled by user');
        },
      });
    } catch (err) {
      console.error('Withdrawal error:', err);
      let errorMessage = 'Failed to submit withdrawal transaction';
      
      if (err instanceof Error) {
        console.error('Error details:', err.message, err.stack);
        
        // Handle specific error cases
        if (err.message.includes('insufficient')) {
          errorMessage = 'Insufficient STX balance for transaction fees. Please ensure you have enough STX for gas fees.';
        } else if (err.message.includes('contract')) {
          errorMessage = 'Contract not found or not accessible. Please check your network connection.';
        } else if (err.message.includes('post condition')) {
          errorMessage = 'Transaction post-condition failed. This may indicate a contract issue.';
        } else if (err.message.includes('broadcast')) {
          errorMessage = 'Transaction failed to broadcast. Please check your network connection and try again.';
        } else if (err.message.includes('rejected')) {
          errorMessage = 'Transaction was rejected by the network. Please ensure your deposit is unlocked and try again.';
        } else if (err.message.includes('nonce')) {
          errorMessage = 'Transaction nonce error. Please wait a moment and try again.';
        } else {
          errorMessage = `Transaction failed: ${err.message}`;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper calculations
  const hasDeposit = depositInfo.amount > 0;
  const isLocked = currentBlock < depositInfo.lockExpiry;
  const remainingBlocks = Math.max(0, depositInfo.lockExpiry - currentBlock);

  const formatTimeRemaining = (blocks: number) => {
    if (blocks <= 0) return 'Unlocked';
    
    const minutes = blocks * 10;
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-2">Withdraw STX</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              Access your unlocked STX deposits. Connect your wallet to check your withdrawal status.
            </p>
            
            <div className="p-6 bg-gray-800 border border-gray-700 rounded-lg shadow-sm">
              <p className="text-gray-400">Please connect your wallet to view withdrawal options.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Withdraw STX</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">Access your unlocked deposits</p>
        </div>

        <div className="space-y-6">
          {/* Loading State */}
          {isLoading && (
            <div className="p-8 bg-gray-800 border border-gray-700 rounded-lg shadow-sm text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading your deposit information...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-4 bg-red-900/20 border border-red-800 rounded-md">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Success State */}
          {success && (
            <div className="p-4 bg-green-900/20 border border-green-800 rounded-md">
              <p className="text-green-600 dark:text-green-400">{success}</p>
            </div>
          )}

          {/* No Deposit State */}
          {!isLoading && !hasDeposit && (
            <div className="p-8 bg-gray-800 border border-gray-700 rounded-lg shadow-sm text-center">
              <h3 className="text-xl font-semibold text-white mb-2">No Active Deposits</h3>
              <p className="text-gray-400 mb-6">You don't have any deposits to withdraw.</p>
              <a
                href="/deposit"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Make a Deposit
              </a>
            </div>
          )}

          {/* Deposit Information */}
          {!isLoading && hasDeposit && (
            <div className="space-y-6">
              {/* Status Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Deposit Amount */}
                <div className="p-6 bg-gray-800 border border-gray-700 rounded-lg shadow-sm">
                  <h3 className="text-sm font-medium text-gray-300 mb-1">Deposit Amount</h3>
                  <p className="text-3xl font-bold text-white">{depositInfo.amount.toFixed(6)}</p>
                  <p className="text-sm text-gray-400 mt-1">STX</p>
                </div>

                {/* Lock Status */}
                <div className="p-6 bg-gray-800 border border-gray-700 rounded-lg shadow-sm">
                  <h3 className="text-sm font-medium text-gray-300 mb-1">Status</h3>
                  <p className="text-2xl font-bold text-white">
                    {isLocked ? '🔒 Locked' : '🔓 Unlocked'}
                  </p>
                </div>

                {/* Time Remaining */}
                <div className="p-6 bg-gray-800 border border-gray-700 rounded-lg shadow-sm">
                  <h3 className="text-sm font-medium text-gray-300 mb-1">Time Remaining</h3>
                  <p className="text-2xl font-bold text-white">
                    {formatTimeRemaining(remainingBlocks)}
                  </p>
                </div>
              </div>

              {/* Withdrawal Action */}
              <div className="p-8 bg-gray-800 border border-gray-700 rounded-lg shadow-sm text-center">
                <h2 className="text-2xl font-bold text-white mb-4">
                  {isLocked ? 'Deposit Still Locked' : 'Ready to Withdraw'}
                </h2>
                
                <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                  {isLocked 
                    ? `Your deposit is still locked for ${formatTimeRemaining(remainingBlocks)}. You can withdraw once the lock period expires.`
                    : `Your deposit is now unlocked and ready for withdrawal. You can access your ${depositInfo.amount.toFixed(6)} STX.`
                  }
                </p>
                
                <button
                  onClick={handleWithdraw}
                  disabled={isLocked || isLoading}
                  className={`px-8 py-3 text-lg font-semibold rounded-md transition-colors ${
                    isLocked || isLoading
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isLocked 
                    ? `Locked for ${formatTimeRemaining(remainingBlocks)}`
                    : isLoading 
                      ? 'Processing Withdrawal...'
                      : `Withdraw ${depositInfo.amount.toFixed(6)} STX`
                  }
                </button>
              </div>

              {/* Deposit Details */}
              <div className="p-6 bg-gray-800 border border-gray-700 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-white mb-4">Deposit Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                  <div>
                    <span className="text-gray-400">Deposit Block:</span>
                    <p className="font-mono text-white mt-1">#{depositInfo.depositBlock}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Unlock Block:</span>
                    <p className="font-mono text-white mt-1">#{depositInfo.lockExpiry}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Current Block:</span>
                    <p className="font-mono text-white mt-1">#{currentBlock}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}