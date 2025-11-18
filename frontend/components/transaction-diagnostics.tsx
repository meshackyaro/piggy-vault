/**
 * Transaction Diagnostics Component
 * Displays detailed information about the transaction configuration and helps troubleshoot issues
 */

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { 
  CONTRACT_CONFIG, 
  getStacksNetwork, 
  isContractConfigValid, 
  getContractConfigError,
  getContractConfigInfo 
} from '@/lib/stacks-config';
import { verifyContractExists, getContractInfo } from '@/lib/contract';
import { isWalletExtensionInstalled } from '@/lib/transaction-builder';

export default function TransactionDiagnostics() {
  const { user, isConnected } = useWallet();
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const runDiagnostics = async () => {
    setIsLoading(true);
    
    try {
      const network = getStacksNetwork();
      const configInfo = getContractConfigInfo();
      const contractInfo = getContractInfo();
      const walletInstalled = isWalletExtensionInstalled();
      
      let contractExists = false;
      let contractError = null;
      
      try {
        contractExists = await verifyContractExists();
      } catch (error) {
        contractError = error instanceof Error ? error.message : 'Unknown error';
      }

      const results = {
        timestamp: new Date().toISOString(),
        wallet: {
          connected: isConnected,
          address: user?.address || 'Not connected',
          extensionInstalled: walletInstalled,
        },
        contract: {
          address: CONTRACT_CONFIG.address,
          name: CONTRACT_CONFIG.name,
          isValid: isContractConfigValid(),
          error: getContractConfigError(),
          exists: contractExists,
          verificationError: contractError,
        },
        network: {
          type: process.env.NEXT_PUBLIC_NETWORK || 'testnet',
          chainId: network.chainId || 'unknown',
          apiUrl: 'coreApiUrl' in network ? network.coreApiUrl : 
                  'url' in network ? network.url : 
                  process.env.NEXT_PUBLIC_STACKS_API_URL || 'unknown',
        },
        environment: {
          NEXT_PUBLIC_NETWORK: process.env.NEXT_PUBLIC_NETWORK || 'not set',
          NEXT_PUBLIC_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 'not set',
          NEXT_PUBLIC_CONTRACT_NAME: process.env.NEXT_PUBLIC_CONTRACT_NAME || 'not set',
          NEXT_PUBLIC_STACKS_API_URL: process.env.NEXT_PUBLIC_STACKS_API_URL || 'not set',
        },
        configInfo,
        contractInfo,
      };

      setDiagnostics(results);
    } catch (error) {
      console.error('Error running diagnostics:', error);
      setDiagnostics({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isExpanded && !diagnostics) {
      runDiagnostics();
    }
  }, [isExpanded]);

  const getStatusIcon = (status: boolean | undefined) => {
    if (status === undefined) return '⚠️';
    return status ? '✅' : '❌';
  };

  const getStatusColor = (status: boolean | undefined) => {
    if (status === undefined) return 'text-yellow-600';
    return status ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg">🔍</span>
          <span className="font-medium text-white">Transaction Diagnostics</span>
        </div>
        <span className="text-gray-400">
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-400">
              Check your transaction configuration and troubleshoot issues
            </p>
            <button
              onClick={runDiagnostics}
              disabled={isLoading}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Running...' : 'Refresh'}
            </button>
          </div>

          {diagnostics && !diagnostics.error && (
            <div className="space-y-4">
              {/* Wallet Status */}
              <div className="bg-gray-900 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-3 flex items-center">
                  <span className="mr-2">👛</span>
                  Wallet Status
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Extension Installed:</span>
                    <span className={getStatusColor(diagnostics.wallet.extensionInstalled)}>
                      {getStatusIcon(diagnostics.wallet.extensionInstalled)} {diagnostics.wallet.extensionInstalled ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Connected:</span>
                    <span className={getStatusColor(diagnostics.wallet.connected)}>
                      {getStatusIcon(diagnostics.wallet.connected)} {diagnostics.wallet.connected ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Address:</span>
                    <span className="text-white font-mono text-xs">
                      {diagnostics.wallet.address}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contract Status */}
              <div className="bg-gray-900 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-3 flex items-center">
                  <span className="mr-2">📄</span>
                  Contract Status
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Configuration Valid:</span>
                    <span className={getStatusColor(diagnostics.contract.isValid)}>
                      {getStatusIcon(diagnostics.contract.isValid)} {diagnostics.contract.isValid ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Contract Exists:</span>
                    <span className={getStatusColor(diagnostics.contract.exists)}>
                      {getStatusIcon(diagnostics.contract.exists)} {diagnostics.contract.exists ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-gray-400">Address:</span>
                    <span className="text-white font-mono text-xs break-all">
                      {diagnostics.contract.address}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Name:</span>
                    <span className="text-white font-mono text-xs">
                      {diagnostics.contract.name}
                    </span>
                  </div>
                  {diagnostics.contract.error && (
                    <div className="mt-2 p-2 bg-red-900/20 border border-red-700 rounded">
                      <p className="text-xs text-red-400">{diagnostics.contract.error}</p>
                    </div>
                  )}
                  {diagnostics.contract.verificationError && (
                    <div className="mt-2 p-2 bg-red-900/20 border border-red-700 rounded">
                      <p className="text-xs text-red-400">Verification Error: {diagnostics.contract.verificationError}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Network Status */}
              <div className="bg-gray-900 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-3 flex items-center">
                  <span className="mr-2">🌐</span>
                  Network Configuration
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Network Type:</span>
                    <span className="text-white">{diagnostics.network.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Chain ID:</span>
                    <span className="text-white">{diagnostics.network.chainId}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-gray-400">API URL:</span>
                    <span className="text-white font-mono text-xs break-all">
                      {diagnostics.network.apiUrl}
                    </span>
                  </div>
                </div>
              </div>

              {/* Environment Variables */}
              <details className="bg-gray-900 rounded-lg">
                <summary className="cursor-pointer p-4 font-semibold text-white hover:bg-gray-800 rounded-lg">
                  <span className="mr-2">⚙️</span>
                  Environment Variables
                </summary>
                <div className="px-4 pb-4 space-y-2 text-sm">
                  {Object.entries(diagnostics.environment).map(([key, value]) => (
                    <div key={key} className="flex flex-col space-y-1">
                      <span className="text-gray-400">{key}:</span>
                      <span className="text-white font-mono text-xs break-all">
                        {value as string}
                      </span>
                    </div>
                  ))}
                </div>
              </details>

              {/* Recommendations */}
              {(!diagnostics.wallet.connected || !diagnostics.contract.isValid || !diagnostics.contract.exists) && (
                <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-400 mb-2 flex items-center">
                    <span className="mr-2">💡</span>
                    Recommendations
                  </h3>
                  <ul className="space-y-2 text-sm text-yellow-300">
                    {!diagnostics.wallet.extensionInstalled && (
                      <li>• Install a Stacks wallet extension (Hiro Wallet or Leather)</li>
                    )}
                    {!diagnostics.wallet.connected && (
                      <li>• Connect your wallet using the "Connect Wallet" button</li>
                    )}
                    {!diagnostics.contract.isValid && (
                      <li>• Check your .env.local file and ensure NEXT_PUBLIC_CONTRACT_ADDRESS is set correctly</li>
                    )}
                    {!diagnostics.contract.exists && (
                      <li>• Deploy the contract using: clarinet deployments apply --testnet</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Success Message */}
              {diagnostics.wallet.connected && diagnostics.contract.isValid && diagnostics.contract.exists && (
                <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
                  <p className="text-sm text-green-400 flex items-center">
                    <span className="mr-2">✅</span>
                    All systems operational! You should be able to create transactions.
                  </p>
                </div>
              )}
            </div>
          )}

          {diagnostics?.error && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
              <p className="text-sm text-red-400">Error: {diagnostics.error}</p>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
