/**
 * Join Group Form Component
 * Displays available open groups and allows users to join them
 */

'use client';

import { useState, useEffect } from 'react';
import { useStacks } from '@/hooks/use-stacks';
import { useGroupVault } from '@/hooks/use-group-vault';
import { getLockDurationOptions } from '@/lib/lock-options';
import type { GroupInfo } from '@/lib/group-contract';

interface JoinGroupFormProps {
  onGroupJoined?: (groupId: number) => void;
}

export default function JoinGroupForm({ onGroupJoined }: JoinGroupFormProps) {
  const { user, isConnected } = useStacks();
  const { joinGroup, fetchOpenGroups, isGroupMember } = useGroupVault();
  const [openGroups, setOpenGroups] = useState<GroupInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [joiningGroupId, setJoiningGroupId] = useState<number | null>(null);

  // Get lock duration options for display
  const lockOptions = getLockDurationOptions();

  // Fetch open groups on component mount and when user changes
  useEffect(() => {
    const loadOpenGroups = async () => {
      setIsLoadingGroups(true);
      try {
        const groups = await fetchOpenGroups();
        
        // Filter out groups where user is already a member
        if (user) {
          const filteredGroups = [];
          for (const group of groups) {
            const isMember = await isGroupMember(group.groupId, user.address);
            if (!isMember) {
              filteredGroups.push(group);
            }
          }
          setOpenGroups(filteredGroups);
        } else {
          setOpenGroups(groups);
        }
      } catch (err) {
        console.error('Error loading open groups:', err);
        setError('Failed to load available groups');
      } finally {
        setIsLoadingGroups(false);
      }
    };

    loadOpenGroups();
  }, [user, fetchOpenGroups, isGroupMember]);

  // Handle joining a group
  const handleJoinGroup = async (groupId: number) => {
    if (!isConnected || !user) {
      setError('Please connect your wallet first');
      return;
    }

    setJoiningGroupId(groupId);
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const txId = await joinGroup(groupId);
      
      setSuccess(`Successfully joined group! Transaction ID: ${txId}`);
      
      // Remove the joined group from the list
      setOpenGroups(prev => prev.filter(group => group.groupId !== groupId));
      
      // Notify parent component if callback provided
      if (onGroupJoined) {
        onGroupJoined(groupId);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join group';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setJoiningGroupId(null);
    }
  };

  // Get lock duration label from option value
  const getLockDurationLabel = (duration: number) => {
    // Convert block duration back to option value (this is approximate)
    // We'll match against the closest duration
    const option = lockOptions.find(opt => {
      // This is a simplified mapping - in a real app you'd want exact conversion
      const blockMappings: Record<number, number> = {
        6: 1,    // 1 hour
        18: 2,   // 3 hours
        36: 3,   // 6 hours
        48: 4,   // 8 hours
        144: 5,  // 1 day
        720: 6,  // 5 days
        1008: 7, // 1 week
        2016: 8, // 2 weeks
        4320: 9, // 1 month
        12960: 10, // 3 months
        25920: 11, // 6 months
        38880: 12, // 9 months
        52560: 13, // 1 year
      };
      return blockMappings[duration] === opt.value;
    });
    
    return option ? option.label : `${duration} blocks`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Join Savings Group</h2>
      
      {/* Loading State */}
      {isLoadingGroups && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading available groups...</span>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
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
      {!isLoadingGroups && (
        <>
          {openGroups.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-4">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Available Groups</h3>
              <p className="text-gray-500">
                {user 
                  ? "There are no open groups available to join at the moment, or you're already a member of all existing groups."
                  : "Connect your wallet to see available groups."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Found {openGroups.length} group{openGroups.length !== 1 ? 's' : ''} available to join:
              </p>
              
              {openGroups.map((group) => (
                <div key={group.groupId} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                      <p className="text-sm text-gray-500">Group ID: {group.groupId}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Open
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Creator</p>
                      <p className="text-sm text-gray-900 font-mono">
                        {group.creator.slice(0, 8)}...{group.creator.slice(-4)}
                      </p>
                    </div>
                  </div>

                  {group.threshold && (
                    <div className="mb-4">
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
                  
                  <button
                    onClick={() => handleJoinGroup(group.groupId)}
                    disabled={isLoading || !isConnected || joiningGroupId === group.groupId}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {joiningGroupId === group.groupId ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Joining...
                      </div>
                    ) : (
                      'Join Group'
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Connection Status */}
      {!isConnected && !isLoadingGroups && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">
            Please connect your wallet to join a group
          </p>
        </div>
      )}
    </div>
  );
}