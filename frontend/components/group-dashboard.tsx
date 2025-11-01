/**
 * Group Dashboard Component
 * Displays user's group memberships with deposit/withdraw functionality
 */

'use client';

import { useState, useEffect } from 'react';
import { useStacks } from '@/hooks/use-stacks';
import { useGroupVault } from '@/hooks/use-group-vault';
import { getLockDurationOptions } from '@/lib/lock-options';

interface GroupWithUserData {
  groupId: number;
  creator: string;
  name: string;
  duration: number;
  threshold?: number;
  memberCount: number;
  locked: boolean;
  startBlock?: number;
  lockExpiry?: number;
  isMember: boolean;
  userBalance: number;
  remainingBlocks: number;
  isUnlocked: boolean;
}

export default function GroupDashboard() {
  const { user, isConnected } = useStacks();
  const { 
    fetchAllGroupsWithUserData, 
    groupDeposit, 
    groupWithdraw, 
    startGroupLock,
    isLoading: hookLoading,
    error: hookError 
  } = useGroupVault();
  
  const [groups, setGroups] = useState<GroupWithUserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  
  // Form states for deposit/withdraw
  const [depositAmounts, setDepositAmounts] = useState<{ [key: number]: string }>({});
  const [withdrawAmounts, setWithdrawAmounts] = useState<{ [key: number]: string }>({});

  // Get lock duration options for display
  const lockOptions = getLockDurationOptions();

  // Load user's groups
  useEffect(() => {
    const loadGroups = async () => {
      if (!user) {
        setGroups([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const allGroups = await fetchAllGroupsWithUserData();
        // Filter to only show groups where user is a member
        const userGroups = allGroups.filter(group => group.isMember);
        setGroups(userGroups);
      } catch (err) {
        console.error('Error loading groups:', err);
        setError('Failed to load your groups');
      } finally {
        setIsLoading(false);
      }
    };

    loadGroups();
  }, [user, fetchAllGroupsWithUserData]);

  // Get lock duration label from duration in blocks
  const getLockDurationLabel = (duration: number) => {
    const blockMappings: Record<number, number> = {
      6: 1, 18: 2, 36: 3, 48: 4, 144: 5, 720: 6, 1008: 7, 
      2016: 8, 4320: 9, 12960: 10, 25920: 11, 38880: 12, 52560: 13,
    };
    
    const optionValue = blockMappings[duration];
    const option = lockOptions.find(opt => opt.value === optionValue);
    return option ? option.label : `${duration} blocks`;
  };

  // Handle deposit
  const handleDeposit = async (groupId: number) => {
    const amount = depositAmounts[groupId];
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid deposit amount');
      return;
    }

    const actionKey = `deposit-${groupId}`;
    setActionLoading(prev => ({ ...prev, [actionKey]: true }));
    setError('');
    setSuccess('');

    try {
      const txId = await groupDeposit({
        groupId,
        amount: parseFloat(amount),
      });

      setSuccess(`Deposit successful! Transaction ID: ${txId}`);
      setDepositAmounts(prev => ({ ...prev, [groupId]: '' }));
      
      // Refresh groups data
      const updatedGroups = await fetchAllGroupsWithUserData();
      const userGroups = updatedGroups.filter(group => group.isMember);
      setGroups(userGroups);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deposit';
      setError(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Handle withdraw
  const handleWithdraw = async (groupId: number) => {
    const amount = withdrawAmounts[groupId];
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid withdrawal amount');
      return;
    }

    const actionKey = `withdraw-${groupId}`;
    setActionLoading(prev => ({ ...prev, [actionKey]: true }));
    setError('');
    setSuccess('');

    try {
      const txId = await groupWithdraw({
        groupId,
        amount: parseFloat(amount),
      });

      setSuccess(`Withdrawal successful! Transaction ID: ${txId}`);
      setWithdrawAmounts(prev => ({ ...prev, [groupId]: '' }));
      
      // Refresh groups data
      const updatedGroups = await fetchAllGroupsWithUserData();
      const userGroups = updatedGroups.filter(group => group.isMember);
      setGroups(userGroups);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to withdraw';
      setError(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Handle start group lock (creator only)
  const handleStartLock = async (groupId: number) => {
    const actionKey = `start-lock-${groupId}`;
    setActionLoading(prev => ({ ...prev, [actionKey]: true }));
    setError('');
    setSuccess('');

    try {
      const txId = await startGroupLock(groupId);
      setSuccess(`Group lock started! Transaction ID: ${txId}`);
      
      // Refresh groups data
      const updatedGroups = await fetchAllGroupsWithUserData();
      const userGroups = updatedGroups.filter(group => group.isMember);
      setGroups(userGroups);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start group lock';
      setError(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Format time remaining
  const formatTimeRemaining = (blocks: number) => {
    if (blocks <= 0) return 'Unlocked';
    
    // Approximate conversion (10 minutes per block)
    const minutes = blocks * 10;
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days !== 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  if (!isConnected) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">My Groups</h2>
        <div className="text-center py-8">
          <p className="text-gray-500">Please connect your wallet to view your groups</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">My Groups</h2>
      
      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading your groups...</span>
        </div>
      )}

      {/* Error Display */}
      {(error || hookError) && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error || hookError}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>{success}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Groups List */}
      {!isLoading && (
        <>
          {groups.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-4">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Groups Yet</h3>
              <p className="text-gray-500">You haven't joined any savings groups yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {groups.map((group) => {
                const isCreator = user && group.creator === user.address;
                const canStartLock = isCreator && !group.locked && !group.threshold;
                const canDeposit = group.locked;
                const canWithdraw = group.isUnlocked && group.userBalance > 0;
                
                return (
                  <div key={group.groupId} className="border border-gray-200 rounded-lg p-6">
                    {/* Group Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{group.name}</h3>
                        <p className="text-sm text-gray-500">Group ID: {group.groupId}</p>
                        {isCreator && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                            Creator
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          group.locked 
                            ? group.isUnlocked 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {group.locked 
                            ? group.isUnlocked 
                              ? 'Unlocked' 
                              : 'Locked'
                            : 'Waiting to Start'
                          }
                        </span>
                      </div>
                    </div>

                    {/* Group Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Your Balance</p>
                        <p className="text-lg font-semibold text-gray-900">{group.userBalance.toFixed(6)} STX</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Lock Duration</p>
                        <p className="text-sm text-gray-900">{getLockDurationLabel(group.duration)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Members</p>
                        <p className="text-sm text-gray-900">
                          {group.memberCount}
                          {group.threshold ? ` / ${group.threshold}` : ' (unlimited)'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Time Remaining</p>
                        <p className="text-sm text-gray-900">{formatTimeRemaining(group.remainingBlocks)}</p>
                      </div>
                    </div>

                    {/* Progress Bar for Groups with Threshold */}
                    {group.threshold && (
                      <div className="mb-6">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Member Progress</span>
                          <span>{group.memberCount} / {group.threshold}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(group.memberCount / group.threshold) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="space-y-4">
                      {/* Start Lock Button (Creator Only) */}
                      {canStartLock && (
                        <div>
                          <button
                            onClick={() => handleStartLock(group.groupId)}
                            disabled={actionLoading[`start-lock-${group.groupId}`]}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {actionLoading[`start-lock-${group.groupId}`] ? (
                              <div className="flex items-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Starting Lock...
                              </div>
                            ) : (
                              'Start Group Lock'
                            )}
                          </button>
                          <p className="text-xs text-gray-500 mt-1">
                            As the creator, you can start the lock period manually for this unlimited group.
                          </p>
                        </div>
                      )}

                      {/* Deposit Section */}
                      {canDeposit && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-3">Deposit STX</h4>
                          <div className="flex space-x-3">
                            <input
                              type="number"
                              step="0.000001"
                              min="0"
                              value={depositAmounts[group.groupId] || ''}
                              onChange={(e) => setDepositAmounts(prev => ({ ...prev, [group.groupId]: e.target.value }))}
                              placeholder="Amount in STX"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <button
                              onClick={() => handleDeposit(group.groupId)}
                              disabled={actionLoading[`deposit-${group.groupId}`] || !depositAmounts[group.groupId]}
                              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading[`deposit-${group.groupId}`] ? 'Depositing...' : 'Deposit'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Withdraw Section */}
                      {canWithdraw && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-3">Withdraw STX</h4>
                          <div className="flex space-x-3">
                            <input
                              type="number"
                              step="0.000001"
                              min="0"
                              max={group.userBalance}
                              value={withdrawAmounts[group.groupId] || ''}
                              onChange={(e) => setWithdrawAmounts(prev => ({ ...prev, [group.groupId]: e.target.value }))}
                              placeholder={`Max: ${group.userBalance.toFixed(6)} STX`}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <button
                              onClick={() => handleWithdraw(group.groupId)}
                              disabled={actionLoading[`withdraw-${group.groupId}`] || !withdrawAmounts[group.groupId]}
                              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading[`withdraw-${group.groupId}`] ? 'Withdrawing...' : 'Withdraw'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Status Messages */}
                      {!group.locked && !canStartLock && (
                        <p className="text-sm text-gray-500 italic">
                          Waiting for the group to start or reach member threshold...
                        </p>
                      )}
                      
                      {group.locked && !group.isUnlocked && !canDeposit && (
                        <p className="text-sm text-gray-500 italic">
                          Group is locked. You can deposit funds and wait for the lock period to expire.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}