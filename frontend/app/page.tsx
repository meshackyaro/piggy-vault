/**
 * Dashboard Page - Main landing page for the Piggy Vault dApp
 * Shows wallet connection, vault info, and quick action buttons
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import WalletConnect from '@/components/wallet-connect';
import VaultInfo from '@/components/vault-info';
import { useStacks } from '@/hooks/use-stacks';

export default function Dashboard() {
  const { isConnected } = useStacks();
  const [refreshKey, setRefreshKey] = useState(0);

  // Force refresh of vault info after transactions
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Piggy Vault Dashboard</h1>
        <p className="text-lg text-gray-600">
          A decentralized savings vault with time-locked deposits on Stacks blockchain
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Wallet & Vault Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Wallet Connection */}
          <WalletConnect />
          
          {/* Vault Information - Only show when connected */}
          {isConnected && (
            <div key={refreshKey}>
              <VaultInfo />
            </div>
          )}
        </div>

        {/* Right Column - Quick Actions */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            
            {isConnected ? (
              <div className="space-y-3">
                <Link
                  href="/deposit"
                  className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  💰 Deposit STX
                </Link>
                
                <Link
                  href="/withdraw"
                  className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  💸 Withdraw STX
                </Link>
                
                <button
                  onClick={handleRefresh}
                  className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  🔄 Refresh Data
                </button>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                Connect your wallet to access vault features
              </p>
            )}
          </div>

          {/* How It Works Card */}
          <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">How It Works</h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li className="flex items-start">
                <span className="font-semibold mr-2">1.</span>
                Connect your Stacks wallet
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">2.</span>
                Deposit STX to start saving
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">3.</span>
                Wait 50 blocks (~8.3 hours) for unlock
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">4.</span>
                Withdraw your funds when ready
              </li>
            </ul>
          </div>

          {/* Contract Info Card */}
          <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Contract Info</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><span className="font-medium">Network:</span> Testnet</p>
              <p><span className="font-medium">Lock Period:</span> 50 blocks</p>
              <p><span className="font-medium">Min Deposit:</span> 0.000001 STX</p>
              <p className="text-xs text-gray-500 mt-2">
                Contract: {process.env.NEXT_PUBLIC_CONTRACT_NAME}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
