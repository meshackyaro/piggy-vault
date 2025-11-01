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
          Add STX to your savings vault with flexible time-based lock periods
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
            <VaultInfo 
              refreshTrigger={refreshKey}
              onRefresh={() => console.log('Vault refreshed after deposit')}
            />
          )}

          {/* Deposit Guidelines */}
          <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-900 mb-3">
              ⚠️ Lock Period Guidelines
            </h3>
            <ul className="text-sm text-yellow-800 space-y-2">
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                Choose from 13 predefined lock periods (1 hour to 1 year)
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                Longer locks provide better savings discipline
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                You cannot withdraw until your chosen period expires
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                New deposits will overwrite previous ones
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                Minimum deposit amount is 0.000001 STX
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                Always keep some STX for transaction fees
              </li>
            </ul>
          </div>

          {/* Lock Period Options */}
          <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              ⏰ Available Lock Periods
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm text-blue-800">
              <div>
                <h4 className="font-semibold mb-2">Short-term (Hours)</h4>
                <ul className="space-y-1">
                  <li>• 1 hour (6 blocks)</li>
                  <li>• 3 hours (18 blocks)</li>
                  <li>• 6 hours (36 blocks)</li>
                  <li>• 8 hours (48 blocks)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Medium-term (Days/Weeks)</h4>
                <ul className="space-y-1">
                  <li>• 1 day (144 blocks)</li>
                  <li>• 5 days (720 blocks)</li>
                  <li>• 1 week (1,008 blocks)</li>
                  <li>• 2 weeks (2,016 blocks)</li>
                </ul>
              </div>
              <div className="col-span-2">
                <h4 className="font-semibold mb-2">Long-term (Months/Year)</h4>
                <div className="grid grid-cols-2 gap-2">
                  <ul className="space-y-1">
                    <li>• 1 month (4,320 blocks)</li>
                    <li>• 3 months (12,960 blocks)</li>
                  </ul>
                  <ul className="space-y-1">
                    <li>• 6 months (25,920 blocks)</li>
                    <li>• 9 months (38,880 blocks)</li>
                    <li>• 1 year (52,560 blocks)</li>
                  </ul>
                </div>
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-3 italic">
              * Block counts based on ~10 minutes per Stacks block
            </p>
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