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
  standardPrincipalCV,
  cvToJSON,
} from '@stacks/transactions';
import { openContractCall } from '@stacks/connect';
import { 
  getStacksNetwork, 
  CONTRACT_CONFIG, 
  stxToMicroStx, 
  microStxToStx,
  isContractConfigValid,
  getContractConfigError 
} from '@/lib/stacks-config';
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
    // Pre-flight validation checks
    if (!isConnected || !user) {
      const error = 'Please connect your wallet first';
      setError(error);
      throw new Error(error);
    }

    // Validate contract configuration before attempting transaction
    if (!isContractConfigValid()) {
      const configError = getContractConfigError();
      setError(configError || 'Contract configuration is invalid');
      throw new Error(configError || 'Contract configuration is invalid');
    }

    // Validate amount
    if (!params.amount || params.amount <= 0) {
      const error = 'Invalid deposit amount';
      setError(error);
      throw new Error(error);
    }

    // Validate lock option
    if (!params.lockOption || params.lockOption < 1 || params.lockOption > 13) {
      const error = 'Invalid lock option. Please select a valid lock duration (1-13)';
      setError(error);
      throw new Error(error);
    }

    setIsLoading(true);
    setError(null);

    try {
      const network = getStacksNetwork();
      
      // Validate network configuration
      if (!network || !network.coreApiUrl) {
        throw new Error('Network configuration is invalid. Please check your environment settings.');
      }

      const amountInMicroStx = stxToMicroStx(params.amount);
      
      // Validate conversion
      if (isNaN(amountInMicroStx) || amountInMicroStx <= 0) {
        throw new Error('Failed to convert STX amount. Please check your input.');
      }

      // Prepare function arguments with proper type validation
      const functionArgs = [
        uintCV(amountInMicroStx),
        uintCV(params.lockOption),
        params.name ? someCV(stringAsciiCV(params.name)) : noneCV(),
      ];

      // Import post-condition mode
      const { PostConditionMode } = await import('@stacks/transactions');

      // Log transaction details for debugging
      console.log('Creating deposit transaction:', {
        network: network.coreApiUrl,
        contractAddress: CONTRACT_CONFIG.address,
        contractName: CONTRACT_CONFIG.name,
        functionName: 'create-deposit',
        amount: params.amount,
        amountInMicroStx,
        lockOption: params.lockOption,
        name: params.name,
        userAddress: user.address,
      });

      // Validate all required parameters are present
      if (!CONTRACT_CONFIG.address || !CONTRACT_CONFIG.name) {
        throw new Error('Contract configuration is missing required parameters');
      }

      // Use Stacks Connect to open contract call
      return new Promise((resolve, reject) => {
        try {
          openContractCall({
            network,
            contractAddress: CONTRACT_CONFIG.address,
            contractName: CONTRACT_CONFIG.name,
            functionName: 'create-deposit',
            functionArgs,
            postConditionMode: PostConditionMode.Allow,  // Allow STX transfers
            onFinish: (data) => {
              console.log('Transaction created successfully:', data.txId);
              setError(null);
              resolve(data.txId);
            },
            onCancel: () => {
              const cancelError = 'Transaction cancelled by user';
              console.log(cancelError);
              setError(cancelError);
              reject(new Error(cancelError));
            },
          });
        } catch (txError) {
          console.error('Error generating unsigned stacks transaction:', txError);
          const errorMsg = `Failed to generate transaction: ${txError instanceof Error ? txError.message : 'Unknown error'}. Please ensure your wallet is connected and the contract is deployed.`;
          setError(errorMsg);
          reject(new Error(errorMsg));
        }
      });
    } catch (err) {
      console.error('Create deposit error:', err);
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

    // Validate contract configuration
    if (!isContractConfigValid()) {
      const configError = getContractConfigError();
      throw new Error(configError || 'Contract configuration is invalid');
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
    if (!user?.address) {
      console.log('⚠️ getUserDepositIds: No user connected');
      return [];
    }

    try {
      console.log('🔍 Fetching deposit IDs for user:', user.address);
      
      const result = await callReadOnlyFunction({
        contractAddress: CONTRACT_CONFIG.address,
        contractName: CONTRACT_CONFIG.name,
        functionName: 'get-user-deposit-ids',
        functionArgs: [standardPrincipalCV(user.address)],
      });

      console.log('📦 Raw Clarity Value from get-user-deposit-ids:', result);
      
      // Parse the Clarity Value using cvToJSON
      const data = cvToJSON(result);
      console.log('📦 Parsed JSON data:', JSON.stringify(data, null, 2));
      
      // The contract returns a tuple: { deposit-ids: (list uint) }
      // After cvToJSON, it should be: { type: 'tuple', value: { 'deposit-ids': { type: 'list', value: [...] } } }
      if (data && typeof data === 'object' && 'value' in data) {
        const tupleData = data.value;
        
        if (tupleData && typeof tupleData === 'object' && 'deposit-ids' in tupleData) {
          const depositIdsField = tupleData['deposit-ids'];
          
          // Extract the list value
          const depositIdsList = depositIdsField && typeof depositIdsField === 'object' && 'value' in depositIdsField 
            ? depositIdsField.value 
            : depositIdsField;
          
          if (Array.isArray(depositIdsList)) {
            if (depositIdsList.length === 0) {
              console.log('📋 Empty deposit list - no deposits created yet');
              return [];
            }
            
            // Each item in the list is a uint CV: { type: 'uint', value: '123' }
            const mappedIds = depositIdsList.map((item: any) => {
              const value = item && typeof item === 'object' && 'value' in item ? item.value : item;
              return Number(value);
            });
            
            console.log('✅ Found deposit IDs:', mappedIds);
            return mappedIds;
          }
        }
      }

      console.log('⚠️ No deposit IDs found - unexpected data structure');
      return [];
    } catch (err) {
      console.error('❌ Error fetching user deposit IDs:', err);
      return [];
    }
  }, [user?.address]);

  /**
   * Get detailed information for a specific deposit
   * @param depositId - ID of the deposit
   * @returns Promise<DepositInfo | null>
   */
  const getDepositInfo = useCallback(async (depositId: number): Promise<DepositInfo | null> => {
    if (!user?.address) {
      console.log(`⚠️ getDepositInfo: No user connected for deposit #${depositId}`);
      return null;
    }

    try {
      console.log(`🔍 Fetching info for deposit #${depositId} for user:`, user.address);
      
      const [depositResult, isLockedResult, remainingBlocksResult] = await Promise.all([
        callReadOnlyFunction({
          contractAddress: CONTRACT_CONFIG.address,
          contractName: CONTRACT_CONFIG.name,
          functionName: 'get-user-deposit',
          functionArgs: [
            standardPrincipalCV(user.address),
            uintCV(depositId),
          ],
        }),
        callReadOnlyFunction({
          contractAddress: CONTRACT_CONFIG.address,
          contractName: CONTRACT_CONFIG.name,
          functionName: 'is-deposit-locked',
          functionArgs: [
            standardPrincipalCV(user.address),
            uintCV(depositId),
          ],
        }),
        callReadOnlyFunction({
          contractAddress: CONTRACT_CONFIG.address,
          contractName: CONTRACT_CONFIG.name,
          functionName: 'get-deposit-remaining-blocks',
          functionArgs: [
            standardPrincipalCV(user.address),
            uintCV(depositId),
          ],
        }),
      ]);

      const depositData = cvToJSON(depositResult);
      console.log(`📦 Raw depositData for #${depositId}:`, depositData);
      
      if (!depositData || !depositData.value) {
        console.log(`⚠️ No data found for deposit #${depositId}`);
        return null;
      }

      const data = depositData.value;
      const isLockedData = cvToJSON(isLockedResult);
      const remainingBlocksData = cvToJSON(remainingBlocksResult);
      
      console.log(`📦 Extracted data for #${depositId}:`, { data, isLockedData, remainingBlocksData });

      // Helper function to safely extract value
      const extractValue = (obj: any): any => {
        if (obj === null || obj === undefined) return obj;
        if (typeof obj === 'object' && 'value' in obj) return obj.value;
        return obj;
      };

      const depositInfo = {
        depositId,
        amount: microStxToStx(Number(extractValue(data.amount))),
        depositBlock: Number(extractValue(data['deposit-block'])),
        lockExpiry: Number(extractValue(data['lock-expiry'])),
        lockOption: Number(extractValue(data['lock-option'])),
        withdrawn: Boolean(extractValue(data.withdrawn)),
        isLocked: Boolean(extractValue(isLockedData)),
        remainingBlocks: Number(extractValue(remainingBlocksData)),
        name: extractValue(data.name) || undefined,
      };
      
      console.log(`✅ Deposit #${depositId} info:`, depositInfo);
      return depositInfo;
    } catch (err) {
      console.error(`❌ Error fetching deposit #${depositId} info:`, err);
      return null;
    }
  }, [user?.address]);

  /**
   * Get all deposits for the current user
   * @returns Promise<DepositInfo[]>
   */
  const getAllUserDeposits = useCallback(async (): Promise<DepositInfo[]> => {
    if (!user?.address) {
      console.log('⚠️ getAllUserDeposits: No user connected');
      return [];
    }

    try {
      console.log('📋 Getting all deposits for user:', user.address);
      const depositIds = await getUserDepositIds();
      
      if (!Array.isArray(depositIds) || depositIds.length === 0) {
        console.log('📋 No deposit IDs found');
        return [];
      }

      console.log('📋 Fetching details for', depositIds.length, 'deposits');

      // Fetch detailed info for each deposit in parallel
      const deposits = await Promise.all(
        depositIds.map(id => getDepositInfo(id))
      );

      // Ensure deposits is an array before filtering
      if (!Array.isArray(deposits)) {
        console.error('❌ Promise.all did not return an array:', deposits);
        return [];
      }

      // Filter out null results and return
      const validDeposits = deposits.filter((deposit): deposit is DepositInfo => deposit !== null);
      console.log('📋 Returning', validDeposits.length, 'valid deposits');
      console.log('📋 Valid deposits data:', JSON.stringify(validDeposits, null, 2));
      return validDeposits;
    } catch (err) {
      console.error('❌ Error fetching all user deposits:', err);
      return [];
    }
  }, [user?.address, getUserDepositIds, getDepositInfo]);

  /**
   * Get total balance across all active deposits
   * @returns Promise<number>
   * 
   * NOTE: We calculate this in the frontend instead of using the contract's
   * get-total-user-balance function because that function has a bug where
   * it uses tx-sender instead of the user parameter in its helper function.
   */
  const getTotalBalance = useCallback(async (): Promise<number> => {
    if (!user?.address) {
      console.log('💰 No user connected, returning 0 balance');
      return 0;
    }

    try {
      console.log('💰 Calculating total balance in frontend for user:', user.address);
      
      // Get deposit IDs first
      const depositIds = await getUserDepositIds();
      if (!Array.isArray(depositIds) || depositIds.length === 0) {
        console.log('💰 No deposits found, balance is 0');
        return 0;
      }
      
      // Get all deposit info
      const deposits = await Promise.all(
        depositIds.map(id => getDepositInfo(id))
      );
      
      // Filter out null results and calculate total
      if (!Array.isArray(deposits)) {
        console.error('❌ deposits is not an array in getTotalBalance:', deposits);
        return 0;
      }
      
      const validDeposits = deposits.filter((d): d is DepositInfo => d !== null);
      const total = validDeposits
        .filter(d => d && !d.withdrawn)
        .reduce((sum, d) => sum + d.amount, 0);
      
      console.log('💰 Total balance calculated:', total, 'STX from', validDeposits.length, 'deposits');
      
      return total;
    } catch (err) {
      console.error('❌ Error calculating total balance:', err);
      return 0;
    }
  }, [user?.address, getUserDepositIds, getDepositInfo]);

  /**
   * Get count of active deposits
   * @returns Promise<number>
   * 
   * NOTE: We calculate this in the frontend instead of using the contract's
   * get-active-deposit-count function because that function has a bug where
   * it uses tx-sender instead of the user parameter in its helper function.
   */
  const getActiveDepositCount = useCallback(async (): Promise<number> => {
    if (!user?.address) {
      console.log('🔢 No user connected, returning 0 count');
      return 0;
    }

    try {
      console.log('🔢 Counting active deposits in frontend for user:', user.address);
      
      // Get deposit IDs first
      const depositIds = await getUserDepositIds();
      if (!Array.isArray(depositIds) || depositIds.length === 0) {
        console.log('🔢 No deposits found, count is 0');
        return 0;
      }
      
      // Get all deposit info
      const deposits = await Promise.all(
        depositIds.map(id => getDepositInfo(id))
      );
      
      // Filter out null results and count active deposits
      if (!Array.isArray(deposits)) {
        console.error('❌ deposits is not an array in getActiveDepositCount:', deposits);
        return 0;
      }
      
      const validDeposits = deposits.filter((d): d is DepositInfo => d !== null);
      const count = validDeposits.filter(d => d && !d.withdrawn).length;
      
      console.log('🔢 Active deposit count:', count);
      
      return count;
    } catch (err) {
      console.error('❌ Error counting active deposits:', err);
      return 0;
    }
  }, [user?.address, getUserDepositIds, getDepositInfo]);

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