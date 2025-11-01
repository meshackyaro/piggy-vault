'use client';

import { useState, useEffect } from 'react';

export default function DebugPage() {
  const [contractInfo, setContractInfo] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkContract = async () => {
      try {
        const { CONTRACT_CONFIG, getStacksNetwork } = await import('@/lib/stacks-config');
        const { verifyContractExists, getContractSource } = await import('@/lib/contract');
        
        console.log('Contract Config:', CONTRACT_CONFIG);
        console.log('Network:', getStacksNetwork());
        
        const exists = await verifyContractExists();
        const source = await getContractSource();
        
        setContractInfo({
          config: CONTRACT_CONFIG,
          network: getStacksNetwork(),
          exists,
          source: source.substring(0, 500) + '...',
          env: {
            NEXT_PUBLIC_NETWORK: process.env.NEXT_PUBLIC_NETWORK,
            NEXT_PUBLIC_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
            NEXT_PUBLIC_CONTRACT_NAME: process.env.NEXT_PUBLIC_CONTRACT_NAME,
            NEXT_PUBLIC_STACKS_API_URL: process.env.NEXT_PUBLIC_STACKS_API_URL,
          }
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    checkContract();
  }, []);

  if (loading) return <div className="p-8">Loading contract info...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Contract Debug Information</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-6">
          <h2 className="font-semibold text-red-800">Error:</h2>
          <p className="text-red-600">{error}</p>
        </div>
      )}
      
      {contractInfo && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <h2 className="font-semibold text-blue-800 mb-2">Environment Variables:</h2>
            <pre className="text-sm text-blue-600 whitespace-pre-wrap">
              {JSON.stringify(contractInfo.env, null, 2)}
            </pre>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded p-4">
            <h2 className="font-semibold text-green-800 mb-2">Contract Configuration:</h2>
            <pre className="text-sm text-green-600 whitespace-pre-wrap">
              {JSON.stringify(contractInfo.config, null, 2)}
            </pre>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded p-4">
            <h2 className="font-semibold text-purple-800 mb-2">Network Configuration:</h2>
            <pre className="text-sm text-purple-600 whitespace-pre-wrap">
              {JSON.stringify(contractInfo.network, null, 2)}
            </pre>
          </div>
          
          <div className={`border rounded p-4 ${contractInfo.exists ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <h2 className={`font-semibold mb-2 ${contractInfo.exists ? 'text-green-800' : 'text-red-800'}`}>
              Contract Exists: {contractInfo.exists ? 'YES' : 'NO'}
            </h2>
            {contractInfo.exists && (
              <div>
                <h3 className="font-medium text-green-700 mb-1">Contract Source (preview):</h3>
                <pre className="text-xs text-green-600 whitespace-pre-wrap bg-white p-2 rounded">
                  {contractInfo.source}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}