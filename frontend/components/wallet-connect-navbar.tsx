/**
 * Navbar Wallet Connection Component
 * Simplified wallet connection for navbar - just shows connection status and basic controls
 */

'use client';

import { useWallet } from '@/contexts/wallet-context';

export default function WalletConnectNavbar() {
  const { user, isLoading, isConnected, connectWallet, disconnectWallet } = useWallet();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-400">Connecting...</span>
      </div>
    );
  }

  // Show connected state with user info and disconnect option
  if (isConnected && user) {
    return (
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm font-medium text-white">
            {user.address.slice(0, 6)}...{user.address.slice(-4)}
          </span>
        </div>
        <button
          onClick={disconnectWallet}
          className="px-3 py-1 text-xs font-medium text-gray-400 hover:text-white border border-gray-600 rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // Show simple connect button when not connected
  return (
    <button
      onClick={connectWallet}
      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={isLoading}
    >
      {isLoading ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}