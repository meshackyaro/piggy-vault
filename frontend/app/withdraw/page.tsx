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
                Funds must be unlocked (chosen lock period must expire)
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                You can withdraw partial or full amounts when unlocked
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                Withdrawals are processed immediately when available
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                Transaction fees are deducted from your wallet balance
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                Check vault info for exact unlock time remaining
              </li>
            </ul>
          </div>

          {/* Lock Period Info */}
          <div className="p-6 bg-purple-50 border border-purple-200 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-900 mb-3">
              ⏰ Understanding Time-Based Locks
            </h3>
            <div className="text-sm text-purple-800 space-y-2">
              <p>
                <span className="font-semibold">Lock Options:</span> 13 predefined periods (1 hour to 1 year)
              </p>
              <p>
                <span className="font-semibold">Block Time:</span> ~10 minutes average on Stacks
              </p>
              <p>
                <span className="font-semibold">Purpose:</span> Flexible savings discipline for any goal
              </p>
              <div className="mt-3 p-2 bg-purple-100 rounded text-xs">
                <p className="font-semibold mb-1">Examples:</p>
                <p>• 1 hour = 6 blocks (quick save)</p>
                <p>• 1 day = 144 blocks (daily discipline)</p>
                <p>• 1 month = 4,320 blocks (monthly goals)</p>
                <p>• 1 year = 52,560 blocks (long-term commitment)</p>
              </div>
            </div>
          </div>

          {/* Emergency Notice */}
          <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-lg font-semibold text-red-900 mb-3">
              🚨 Important: No Emergency Access
            </h3>
            <div className="text-sm text-red-800 space-y-2">
              <p>
                There is no emergency withdrawal feature. Funds are locked by the smart contract 
                until your chosen lock period expires completely.
              </p>
              <p className="font-semibold">
                Choose your lock period carefully:
              </p>
              <ul className="ml-4 space-y-1">
                <li>• Only deposit funds you won&apos;t need during the lock period</li>
                <li>• Consider shorter periods if you&apos;re unsure about your needs</li>
                <li>• Remember that new deposits overwrite previous ones</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}