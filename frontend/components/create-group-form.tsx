/**
 * Create Group Form Component
 * Allows users to create new savings groups with customizable settings
 */

'use client';

import { useState } from 'react';
import { useStacks } from '@/hooks/use-stacks';
import { useGroupVault } from '@/hooks/use-group-vault';
import { getLockDurationOptions } from '@/lib/lock-options';

interface CreateGroupFormProps {
  onGroupCreated?: (groupId: number) => void;
}

export default function CreateGroupForm({ onGroupCreated }: CreateGroupFormProps) {
  const { user, isConnected } = useStacks();
  const { createGroup, isLoading: hookLoading, error: hookError } = useGroupVault();
  const [groupName, setGroupName] = useState<string>('');
  const [selectedLockOption, setSelectedLockOption] = useState<number>(5); // Default to 1 day
  const [threshold, setThreshold] = useState<string>('');
  const [hasThreshold, setHasThreshold] = useState<boolean>(false);
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

    // Validate group name
    if (!groupName.trim()) {
      setError('Please enter a group name');
      return;
    }

    if (groupName.length > 50) {
      setError('Group name must be 50 characters or less');
      return;
    }

    // Validate threshold if enabled
    if (hasThreshold) {
      const thresholdNum = parseInt(threshold);
      if (isNaN(thresholdNum) || thresholdNum < 2 || thresholdNum > 100) {
        setError('Threshold must be between 2 and 100 members');
        return;
      }
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const params = {
        name: groupName.trim(),
        lockOption: selectedLockOption,
        threshold: hasThreshold ? parseInt(threshold) : undefined,
      };

      const txId = await createGroup(params);
      
      setSuccess(`Group created successfully! Transaction ID: ${txId}`);
      
      // Reset form
      setGroupName('');
      setThreshold('');
      setHasThreshold(false);
      setSelectedLockOption(5);
      
      // Notify parent component if callback provided
      if (onGroupCreated) {
        // We don't have the group ID from the transaction, so we'll pass 0
        // The parent can refetch the groups list to get the latest data
        onGroupCreated(0);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create group';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Savings Group</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Group Name Input */}
        <div>
          <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 mb-2">
            Group Name
          </label>
          <input
            type="text"
            id="groupName"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Enter group name (max 50 characters)"
            maxLength={50}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            {groupName.length}/50 characters
          </p>
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
                {option.label}
              </option>
            ))}
          </select>
          {selectedOption && (
            <p className="text-xs text-gray-500 mt-1">
              Selected: {selectedOption.label}
            </p>
          )}
        </div>

        {/* Member Threshold Toggle */}
        <div>
          <div className="flex items-center mb-3">
            <input
              type="checkbox"
              id="hasThreshold"
              checked={hasThreshold}
              onChange={(e) => setHasThreshold(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={isLoading}
            />
            <label htmlFor="hasThreshold" className="ml-2 block text-sm text-gray-700">
              Set member limit (optional)
            </label>
          </div>
          
          {hasThreshold && (
            <div>
              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder="Enter maximum number of members (2-100)"
                min="2"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                If set, the group will automatically lock when this number of members is reached.
                If not set, you can manually start the lock at any time.
              </p>
            </div>
          )}
        </div>

        {/* Error Display */}
        {(error || hookError) && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
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
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
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

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isLoading || hookLoading || !isConnected}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {(isLoading || hookLoading) ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating Group...
              </div>
            ) : (
              'Create Group'
            )}
          </button>
        </div>

        {/* Connection Status */}
        {!isConnected && (
          <p className="text-sm text-gray-500 text-center">
            Please connect your wallet to create a group
          </p>
        )}
      </form>
    </div>
  );
}