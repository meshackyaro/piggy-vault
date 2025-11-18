/**
 * Debug Deposits Page - Diagnostic tool for deposit visibility issues
 * This page helps identify why deposits might not be showing on the withdraw page
 */

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { useMultipleDeposits } from '@/hooks/use-multiple-deposits';
import { getUserDeposit, isUserLocked, getRemainingLockBlocks, getCurrentBlockHeight } from '@/lib/contract';

export default function DebugDepositsPage() {
  const { user, isConnected } = useWallet();
  const { getAllUserDeposits, getUserDepositIds, getTotalBalance } = useMultipleDeposits();
  
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runDiagnostics = async () => {
    if (!user?.address) {
      alert('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    const info: any = {
      timestamp: new Date().toISOString(),
      userAddress: user.address,
      multipleDeposits: null,
      legacyDeposit: null,
      depositIds: null,
      totalBalance: null,
      currentBlock: null,
      errors: [],
    };

    try {
      // Check multiple deposits system
      console.log('🔍 Checking multiple deposits...');
      try {
        const depositIds = await getUserDepositIds();
        info.depositIds = depositIds;
        console.log('✅ Deposit IDs:', depositIds);

        const deposits = await getAllUserDeposits();
        info.multipleDeposits = deposits;
        console.log('✅ Multiple deposits:', deposits);

        const balance = await getTotalBalance();
        info.totalBalance = balance;
        console.log('✅ Total balance:', balance);
      } catch (err) {
        console.error('❌ Error with multiple deposits:', err);
        info.errors.push(`Multiple deposits error: ${err instanceof Error ? err.message : 'Unknown'}`);
      }

      // Check legacy deposit
      console.log('🔍 Checking legacy deposit...');
      try {
        const legacyDeposit = await getUserDeposit(user.address);
        if (legacyDeposit && legacyDeposit.amount > 0) {
          const isLocked = await isUserLocked(user.address);
          const remainingBlocks = await getRemainingLockBlocks(user.address);
          
          info.legacyDeposit = {
            ...legacyDeposit,
            isLocked,
            remainingBlocks,
          };
          console.log('✅ Legacy deposit found:', info.legacyDeposit);
        } else {
          info.legacyDeposit = 'No legacy deposit found';
          console.log('⚠️ No legacy deposit');
        }
      } catch (err) {
        console.error('❌ Error with legacy deposit:', err);
        info.errors.push(`Legacy deposit error: ${err instanceof Error ? err.message : 'Unknown'}`);
      }

      // Get current block
      try {
        const blockHeight = await getCurrentBlockHeight();
        info.currentBlock = blockHeight;
        console.log('✅ Current block:', blockHeight);
      } catch (err) {
        console.error('❌ Error getting block height:', err);
        info.errors.push(`Block height error: ${err instanceof Error ? err.message : 'Unknown'}`);
      }

    } catch (err) {
      console.error('❌ Diagnostic error:', err);
      info.errors.push(`General error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setDebugInfo(info);
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-white mb-4">Debug Deposits</h1>
          <div className="p-6 bg-gray-800 border border-gray-700 rounded-lg">
            <p className="text-gray-400">Please connect your wallet to run diagnostics.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-white mb-4">Debug Deposits</h1>
        <p className="text-gray-400 mb-6">
          This diagnostic tool helps identify why deposits might not be showing on the withdraw page.
        </p>

        <button
          onClick={runDiagnostics}
          disabled={isLoading}
          className="mb-6 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Running Diagnostics...' : 'Run Diagnostics'}
        </button>

        {debugInfo && (
          <div className="space-y-4">
            {/* User Info */}
            <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
              <h2 className="text-xl font-semibold text-white mb-2">User Information</h2>
              <div className="space-y-1 text-sm">
                <p className="text-gray-300">
                  <span className="font-medium">Address:</span> {debugInfo.userAddress}
                </p>
                <p className="text-gray-300">
                  <span className="font-medium">Timestamp:</span> {debugInfo.timestamp}
                </p>
                <p className="text-gray-300">
                  <span className="font-medium">Current Block:</span> {debugInfo.currentBlock || 'N/A'}
                </p>
              </div>
            </div>

            {/* Multiple Deposits */}
            <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
              <h2 className="text-xl font-semibold text-white mb-2">Multiple Deposits System</h2>
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-gray-400">Deposit IDs:</p>
                  <pre className="mt-1 p-2 bg-gray-900 rounded text-xs text-green-400 overflow-x-auto">
                    {JSON.stringify(debugInfo.depositIds, null, 2)}
                  </pre>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-400">Deposits Data:</p>
                  <pre className="mt-1 p-2 bg-gray-900 rounded text-xs text-green-400 overflow-x-auto">
                    {JSON.stringify(debugInfo.multipleDeposits, null, 2)}
                  </pre>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-400">Total Balance:</p>
                  <p className="text-white">{debugInfo.totalBalance} STX</p>
                </div>
              </div>
            </div>

            {/* Legacy Deposit */}
            <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
              <h2 className="text-xl font-semibold text-white mb-2">Legacy Deposit (Single Deposit System)</h2>
              <pre className="mt-1 p-2 bg-gray-900 rounded text-xs text-green-400 overflow-x-auto">
                {JSON.stringify(debugInfo.legacyDeposit, null, 2)}
              </pre>
            </div>

            {/* Errors */}
            {debugInfo.errors.length > 0 && (
              <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg">
                <h2 className="text-xl font-semibold text-red-400 mb-2">Errors</h2>
                <ul className="list-disc list-inside space-y-1">
                  {debugInfo.errors.map((error: string, index: number) => (
                    <li key={index} className="text-red-300 text-sm">{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            <div className="p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
              <h2 className="text-xl font-semibold text-blue-400 mb-2">Recommendations</h2>
              <ul className="list-disc list-inside space-y-2 text-sm text-blue-300">
                {debugInfo.multipleDeposits && debugInfo.multipleDeposits.length > 0 && (
                  <li>✅ Multiple deposits found - these should appear on the withdraw page</li>
                )}
                {debugInfo.legacyDeposit && typeof debugInfo.legacyDeposit === 'object' && (
                  <li>✅ Legacy deposit found - this should now appear on the withdraw page</li>
                )}
                {(!debugInfo.multipleDeposits || debugInfo.multipleDeposits.length === 0) && 
                 debugInfo.legacyDeposit === 'No legacy deposit found' && (
                  <li>⚠️ No deposits found - create a deposit first on the deposit page</li>
                )}
                {debugInfo.errors.length > 0 && (
                  <li>❌ Errors detected - check contract deployment and network connection</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
