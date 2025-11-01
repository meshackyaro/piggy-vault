/**
 * Wallet Connection Component
 * Handles Stacks wallet connection UI and user authentication state
 */

'use client';

import { useStacks } from '@/hooks/use-stacks';

export default function WalletConnect() {
  const { user, isLoading, isConnected, error, connectWallet, disconnectWallet } = useStacks();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Checking wallet connection...</span>
      </div>
    );
  }

  // Show connected state with user info and disconnect option
  if (isConnected && user) {
    return (
      <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-green-800">Wallet Connected</span>
          <span className="text-xs text-green-600 font-mono">
            {user.address.slice(0, 8)}...{user.address.slice(-8)}
          </span>
        </div>
        <button
          onClick={disconnectWallet}
          className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // Show connect button when not connected
  return (
    <div className="flex flex-col items-center p-6 bg-gray-50 border border-gray-200 rounded-lg">
      <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your Wallet</h3>
      <p className="text-sm text-gray-600 mb-4 text-center">
        Connect your Stacks wallet to interact with StackIt
      </p>
      
      {error && (
        <div className="w-full mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      
      <button
        onClick={connectWallet}
        className="px-6 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isLoading}
      >
        {isLoading ? 'Connecting...' : 'Connect Wallet'}
      </button>
      
      <p className="text-xs text-gray-500 mt-3 text-center">
        Make sure your wallet is set to <strong>testnet</strong> mode
      </p>
    </div>
  );
}