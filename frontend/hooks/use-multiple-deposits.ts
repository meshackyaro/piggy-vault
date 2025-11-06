/**
 * Custom hook for Multiple Deposits functionality
 * Handles creating, managing, and withdrawing from multiple independent deposits
 */

'use client';

import { useState, useCallback } from 'react';
import { useStacks } from './use-stacks';
import { 
  uintCV,
  stringAsciiCV,
  someCV,
  noneCV,
} from '@stacks/transactions';
import { openContractCall } from '@stacks/connect';
import { getStacksNetwork, CONTRACT_CONFIG, stxToMicroStx, microStxToStx } from '@/lib/stacks-config';
import { 
  callReadOnlyFunction,
  handleContractError,
} from '@/lib/contract';

export interface CreateDepositParams {
  amount: number;
  lockOption: number;
  name?: string;
}

export interface WithdrawDepositParams {
  depositId: number;
  amount: number;
}

export interface DepositInfo {
  depositId: number;
  amount: number;
  depositBlock: number;
  lockExpiry: number;
  lockOption: number;
  withdrawn: boolean;
  isLocked: boolean;
  remainingBlocks: number;
  name?: string;
}

export const useMultipleDeposits = () => {
  const { user, userSession, isConnected } = useStacks();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a new deposit with independent lock period
   * @param params - Deposit creation parameters
   * @returns Promise<string> - Transaction ID
   */
  const createDeposit = useCallback(async (params: CreateDepositParams): Promise<string> => {
    if (!isConnected || !user) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const network = getStacksNetwork();
      const amountInMicroStx = stxToMicroStx(params.amount);
      
      // Prepare function arguments
      const functionArgs = [
        uintCV(amountInMicroStx),
        uintCV(params.lockOption),
        params.name ? someCV(stringAsciiCV(params.name)) : noneCV(),
      ];

      // Import post-condition mode
      const { PostConditionMode } = await import('@stacks/transactions');

      // Use Stacks Connect to open contract call
      return new Promise((resolve, reject) => {
        openContractCall({
          network,
          contractAddress: CONTRACT_CONFIG.address,
          contractName: CONTRACT_CONFIG.name,
          functionName: 'create-deposit',
          functionArgs,
          postConditionMode: PostConditionMode.Allow,  // Allow STX transfers
          onFinish: (data) => {
            resolve(data.txId);
          },
          onCancel: () => {
            reject(new Error('Transaction cancelled by user'));
          },
        });
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create deposit';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, user]);

  /**
   * Withdraw from a specific deposit
   * @param params - Withdrawal parameters
   * @returns Promise<string> - Transaction ID
   */
  const withdrawDeposit = useCallback(async (params: WithdrawDepositParams): Promise<string> => {
    if (!isConnected || !user) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const network = getStacksNetwork();
      const amountInMicroStx = stxToMicroStx(params.amount);
      
      // Prepare function arguments
      const functionArgs = [
        uintCV(params.depositId),
        uintCV(amountInMicroStx),
      ];

      // Import post-condition mode
      const { PostConditionMode } = await import('@stacks/transactions');

      // Use Stacks Connect to open contract call
      return new Promise((resolve, reject) => {
        openContractCall({
          network,
          contractAddress: CONTRACT_CONFIG.address,
          contractName: CONTRACT_CONFIG.name,
          functionName: 'withdraw-deposit',
          functionArgs,
          postConditionMode: PostConditionMode.Allow,  // Allow STX transfers
          onFinish: (data) => {
            resolve(data.txId);
          },
          onCancel: () => {
            reject(new Error('Transaction cancelled by user'));
          },
        });
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to withdraw from deposit';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, user]);

  /**
   * Get all deposit IDs for the current user
   * @returns Promise<number[]> - Array of deposit IDs
   */
  const getUserDepositIds = useCallback(async (): Promise<number[]> => {
    if (!user) return [];

    try {
      const result = await callReadOnlyFunction({
        contractAddress: CONTRACT_CONFIG.address,
        contractName: CONTRACT_CONFIG.name,
        functionName: 'get-user-deposit-ids',
        functionArgs: [
          `'${user.address}`,
        ],
      });

      if (result && typeof result === 'object' && 'deposit-ids' in result) {
        const depositIds = result['deposit-ids'] as any[];
        return depositIds.map(id => parseInt(id.value || id));
      }

      return [];
    } catch (err) {
      console.error('Error fetching user deposit IDs:', err);
      return [];
    }
  }, [user]);

  /**
   * Get detailed information for a specific deposit
   * @param depositId - ID of the deposit
   * @returns Promise<DepositInfo | null>
   */
  const getDepositInfo = useCallback(async (depositId: number): Promise<DepositInfo | null> => {
    if (!user) return null;

    try {
      const [depositData, isLocked, remainingBlocks] = await Promise.all([
        callReadOnlyFunction({
          contractAddress: CONTRACT_CONFIG.address,
          contractName: CONTRACT_CONFIG.name,
          functionName: 'get-user-deposit',
          functionArgs: [
            `'${user.address}`,
            uintCV(depositId).value,
          ],
        }),
        callReadOnlyFunction({
          contractAddress: CONTRACT_CONFIG.address,
          contractName: CONTRACT_CONFIG.name,
          functionName: 'is-deposit-locked',
          functionArgs: [
            `'${user.address}`,
            uintCV(depositId).value,
          ],
        }),
        callReadOnlyFunction({
          contractAddress: CONTRACT_CONFIG.address,
          contractName: CONTRACT_CONFIG.name,
          functionName: 'get-deposit-remaining-blocks',
          functionArgs: [
            `'${user.address}`,
            uintCV(depositId).value,
          ],
        }),
      ]);

      if (!depositData) return null;

      return {
        depositId,
        amount: microStxToStx(parseInt(depositData.amount?.value || depositData.amount || '0')),
        depositBlock: parseInt(depositData['deposit-block']?.value || depositData['deposit-block'] || '0'),
        lockExpiry: parseInt(depositData['lock-expiry']?.value || depositData['lock-expiry'] || '0'),
        lockOption: parseInt(depositData['lock-option']?.value || depositData['lock-option'] || '0'),
        withdrawn: depositData.withdrawn?.value === true || depositData.withdrawn === true,
        isLocked: isLocked?.value === true || isLocked === true,
        remainingBlocks: parseInt(remainingBlocks?.value || remainingBlocks || '0'),
        name: depositData.name?.value || depositData.name || undefined,
      };
    } catch (err) {
      console.error('Error fetching deposit info:', err);
      return null;
    }
  }, [user]);

  /**
   * Get all deposits for the current user
   * @returns Promise<DepositInfo[]>
   */
  const getAllUserDeposits = useCallback(async (): Promise<DepositInfo[]> => {
    if (!user) return [];

    try {
      const depositIds = await getUserDepositIds();
      
      if (depositIds.length === 0) return [];

      // Fetch detailed info for each deposit in parallel
      const deposits = await Promise.all(
        depositIds.map(id => getDepositInfo(id))
      );

      // Filter out null results and return
      return deposits.filter((deposit): deposit is DepositInfo => deposit !== null);
    } catch (err) {
      console.error('Error fetching all user deposits:', err);
      return [];
    }
  }, [user, getUserDepositIds, getDepositInfo]);

  /**
   * Get total balance across all active deposits
   * @returns Promise<number>
   */
  const getTotalBalance = useCallback(async (): Promise<number> => {
    if (!user) return 0;

    try {
      const result = await callReadOnlyFunction({
        contractAddress: CONTRACT_CONFIG.address,
        contractName: CONTRACT_CONFIG.name,
        functionName: 'get-total-user-balance',
        functionArgs: [
          `'${user.address}`,
        ],
      });

      return microStxToStx(parseInt(result?.value || result || '0'));
    } catch (err) {
      console.error('Error fetching total balance:', err);
      return 0;
    }
  }, [user]);

  /**
   * Get count of active deposits
   * @returns Promise<number>
   */
  const getActiveDepositCount = useCallback(async (): Promise<number> => {
    if (!user) return 0;

    try {
      const result = await callReadOnlyFunction({
        contractAddress: CONTRACT_CONFIG.address,
        contractName: CONTRACT_CONFIG.name,
        functionName: 'get-active-deposit-count',
        functionArgs: [
          `'${user.address}`,
        ],
      });

      return parseInt(result?.value || result || '0');
    } catch (err) {
      console.error('Error fetching active deposit count:', err);
      return 0;
    }
  }, [user]);

  return {
    // Transaction functions
    createDeposit,
    withdrawDeposit,
    
    // Data fetching functions
    getUserDepositIds,
    getDepositInfo,
    getAllUserDeposits,
    getTotalBalance,
    getActiveDepositCount,
    
    // State
    isLoading,
    error,
  };
};