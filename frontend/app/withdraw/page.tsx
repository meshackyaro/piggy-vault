/**
 * Withdraw Page - Dedicated page for withdrawing STX from the vault
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import WithdrawForm from '@/components/withdraw-form';
import VaultInfo from '@/components/vault-info';
import WalletConnect from '@/components/wallet-connect';
import { useStacks } from '@/hooks/use-stacks';

export default function WithdrawPage() {
  const { isConnected } = useStacks();
  const [refreshKey, setRefreshKey] = useState(0);

  // Refresh vault info after successful withdrawal
  const handleWithdrawSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb Navigation */}
      <nav className="mb-6">
        <Link 
          href="/" 
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          ← Back to Dashboard
        </Link>
      </nav>

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Withdraw STX</h1>
        <p className="text-lg text-gray-600">
          Withdraw your unlocked STX from the savings vault
        </p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Withdraw Form */}
        <div className="space-y-6">
          {/* Wallet Connection (if not connected) */}
          {!isConnected && <WalletConnect />}
          
          {/* Withdraw Form */}
          <WithdrawForm onWithdrawSuccess={handleWithdrawSuccess} />
        </div>

        {/* Right Column - Vault Info */}
        <div className="space-y-6">
          {/* Current Vault Status */}
          {isConnected && (
            <div key={refreshKey}>
              <VaultInfo />
            </div>
          )}

          {/* Withdrawal Guidelines */}
          <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              📋 Withdrawal Rules
            </h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                Funds must be unlocked (50 blocks passed since deposit)
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                You can withdraw partial or full amounts
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                Withdrawals are processed immediately when unlocked
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                Transaction fees are deducted from your wallet balance
              </li>
            </ul>
          </div>

          {/* Lock Period Info */}
          <div className="p-6 bg-purple-50 border border-purple-200 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-900 mb-3">
              ⏰ Understanding Lock Periods
            </h3>
            <div className="text-sm text-purple-800 space-y-2">
              <p>
                <span className="font-semibold">Lock Duration:</span> 50 blocks (~8.3 hours)
              </p>
              <p>
                <span className="font-semibold">Block Time:</span> ~10 minutes average
              </p>
              <p>
                <span className="font-semibold">Purpose:</span> Encourages long-term saving habits
              </p>
              <p className="text-xs text-purple-600 mt-3">
                The lock period starts from your most recent deposit block height.
              </p>
            </div>
          </div>

          {/* Emergency Notice */}
          <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-lg font-semibold text-red-900 mb-3">
              🚨 Emergency Access
            </h3>
            <p className="text-sm text-red-800">
              There is no emergency withdrawal feature. Funds are locked by the smart contract 
              until the full lock period expires. Plan your deposits accordingly and only 
              deposit funds you won't need immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}