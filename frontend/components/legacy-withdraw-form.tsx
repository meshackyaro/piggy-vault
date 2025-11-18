/**
 * Legacy Withdraw Form Component
 * Handles withdrawals from the old single-deposit system
 * For users who created deposits before the multiple deposit system was implemented
 */

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { getUserDeposit, canWithdraw, getCurrentBlockHeight } from '@/lib/contract';
import { formatRemainingTime } from '@/lib/lock-options';
import { createWithdrawTransaction } from '@/lib/transaction-builder';

export default function LegacyWithdrawForm() {
  const { user, isConnected } = useWallet();
  const [amount, setAmount] = useState<string>('');
  const [depositInfo, setDepositInfo] = useState<{ amount: number; depositBlock: number; lockExpiry?: number }>({ 
    amount: 0, 
    depositBlock: 0 
  });
  const [currentBlock, setCurrentBlock] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Fetch legacy deposit info
  useEffect(() => {
    if (!isConnected || !user) return;

    const fetchDepositInfo = async () => {
      setIsLoadingInfo(true);
      try {
        console.log('🔍 Fetching legacy deposit for user:', user.address);
        
        const [deposit, blockHeight] = await Promise.all([
          getUserDeposit(user.address),
          getCurrentBlockHeight(),
        ]);

        console.log('📦 Legacy deposit data:', deposit);
        
        setDepositInfo(deposit);
        setCurrentBlock(blockHeight);
        
        if (deposit.amount > 0) {
          console.log('✅ Found legacy deposit:', deposit.amount, 'STX');
        } else {
          console.log('ℹ️ No legacy deposit found');
        }
      } catch (err) {
        console.error('❌ Error fetching legacy deposit:', err);
        setError('Failed to load legacy deposit information');
      } finally {
        setIsLoadingInfo(false);
      }
    };

    fetchDepositInfo();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchDepositInfo, 30000);
    return () => clearInterval(interval);
  }, [isConnected, user]);

  // Handle withdrawal
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
    if (!canWithdraw(depositInfo.lockExpiry || 0, currentBlock)) {
      const blocksRemaining = Math.max(0, (depositInfo.lockExpiry || 0) - currentBlock);
      const timeRemaining = formatRemainingTime(blocksRemaining);
      setError(`Funds are still locked for ${timeRemaining} (${blocksRemaining} blocks)`);
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('🔄 Initiating legacy withdrawal:', withdrawAmount, 'STX');
      
      await createWithdrawTransaction({
        amount: withdrawAmount,
        userAddress: user.address,
        onFinish: (data) => {
          console.log('✅ Legacy withdrawal successful:', data.txId);
          setSuccess(`Withdrawal transaction submitted! TX ID: ${data.txId}`);
          setAmount('');
          
          // Refresh deposit info after delay
          setTimeout(async () => {
            try {
              const [deposit, blockHeight] = await Promise.all([
                getUserDeposit(user.address),
                getCurrentBlockHeight(),
              ]);
              setDepositInfo(deposit);
              setCurrentBlock(blockHeight);
            } catch (err) {
              console.error('⚠️ Error refreshing deposit info:', err);
