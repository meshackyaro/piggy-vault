/**
 * Deposit Page - Dedicated page for making STX deposits to the vault
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import DepositForm from '@/components/deposit-form';
import VaultInfo from '@/components/vault-info';
import WalletConnect from '@/components/wallet-connect';
import { useStacks } from '@/hooks/use-stacks';

export default function DepositPage() {
  const { isConnected } = useStacks();
  const [refreshKey, setRefreshKey] = useState(0);

  // Refresh vault info after successful deposit
  const handleDepositSuccess = () => {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Deposit STX</h1>
        <p className="text-lg text-gray-600">
          Add STX to your savings vault with a 50-block lock period
        </p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Deposit Form */}
        <div className="space-y-6">
          {/* Wallet Connection (if not connected) */}
          {!isConnected && <WalletConnect />}
          
          {/* Deposit Form */}
          <DepositForm onDepositSuccess={handleDepositSuccess} />
        </div>

        {/* Right Column - Vault Info */}
        <div className="space-y-6">
          {/* Current Vault Status */}
          {isConnected && (
            <div key={refreshKey}>
              <VaultInfo />
            </div>
          )}

          {/* Deposit Guidelines */}
          <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-900 mb-3">
              ⚠️ Important Guidelines
            </h3>
            <ul className="text-sm text-yellow-800 space-y-2">
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                Deposits are locked for exactly 50 blocks (~8.3 hours)
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                You cannot withdraw until the lock period expires
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                Minimum deposit amount is 0.000001 STX
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                Multiple deposits will reset the lock period
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                Always keep some STX for transaction fees
              </li>
            </ul>
          </div>

          {/* Security Notice */}
          <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900 mb-3">
              🔒 Security Features
            </h3>
            <ul className="text-sm text-green-800 space-y-2">
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                Smart contract enforces lock periods automatically
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                Only you can withdraw your own deposits
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                No admin can access your locked funds
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                All transactions are transparent on-chain
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}