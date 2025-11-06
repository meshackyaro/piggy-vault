/**
 * Price Dashboard Component
 * Displays real-time price information, minimum deposit requirements, and validation status
 * Provides comprehensive monitoring of both market and contract price data
 */

'use client';

import { useState, useEffect } from 'react';
import { useSTXPrice } from '@/hooks/use-stx-price';
import { 
  getContractSTXPrice, 
  getContractMinimumDeposit, 
  getLastPriceUpdate,
  getCurrentBlockHeight 
} from '@/lib/contract';
import { formatPrice, formatSTXAmount } from '@/lib/price-oracle';

interface ContractPriceData {
  contractPrice: number;
  contractMinimum: number;
  lastUpdate: number;
  currentBlock: number;
  isLoading: boolean;
  error: string | null;
}

export default function PriceDashboard() {
  const { 
    stxPrice,
    minimumSTX,
    lastUpdated,
    isLoading: priceLoading,
    error: priceError,
    validateDeposit, 
    calculateUSDValue, 
    formatUSDPrice,
    isDataAvailable
  } = useSTXPrice();
  
  const [contractData, setContractData] = useState<ContractPriceData>({
    contractPrice: 0,
    contractMinimum: 0,
    lastUpdate: 0,
    currentBlock: 0,
    isLoading: true,
    error: null,
  });

  // Fetch contract price data
  const fetchContractData = async () => {
    try {
      setContractData(prev => ({ ...prev, isLoading: true, error: null }));
      
      const [contractPrice, contractMinimum, lastUpdate, currentBlock] = await Promise.all([
        getContractSTXPrice(),
        getContractMinimumDeposit(),
        getLastPriceUpdate(),
        getCurrentBlockHeight(),
      ]);

      setContractData({
        contractPrice,
        contractMinimum,
        lastUpdate,
        currentBlock,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error fetching contract data:', error);
      setContractData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch contract data',
      }));
    }
  };

  // Initial fetch and periodic updates
  useEffect(() => {
    fetchContractData();
    
    // Update contract data every 30 seconds
    const interval = setInterval(fetchContractData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Calculate price discrepancy (with safety checks)
  const priceDiscrepancy = (stxPrice && contractData.contractPrice) 
    ? Math.abs(stxPrice - contractData.contractPrice)
    : 0;
  const discrepancyPercentage = contractData.contractPrice > 0 
    ? (priceDiscrepancy / contractData.contractPrice) * 100 
    : 0;

  // Calculate time since last update
  const blocksSinceUpdate = contractData.currentBlock > contractData.lastUpdate 
    ? contractData.currentBlock - contractData.lastUpdate 
    : 0;
  const timeSinceUpdate = blocksSinceUpdate * 10; // Approximate minutes

  // Determine sync status
  const isSynced = discrepancyPercentage < 5; // Consider synced if within 5%
  const isStale = timeSinceUpdate > 60; // Consider stale if older than 1 hour

  // Show loading state if price data is not available
  if (!isDataAvailable || priceLoading || contractData.isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Price Monitoring Dashboard</h2>
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-400">Loading...</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 bg-gray-800 border border-gray-200 rounded-lg animate-pulse">
              <div className="h-4 bg-gray-300 rounded mb-2"></div>
              <div className="h-8 bg-gray-300 rounded mb-1"></div>
              <div className="h-3 bg-gray-300 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Price Monitoring Dashboard</h2>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isSynced ? 'bg-green-400' : 'bg-orange-400'}`}></div>
          <span className="text-sm text-gray-400">
            {isSynced ? 'Synchronized' : 'Price Drift Detected'}
          </span>
        </div>
      </div>

      {/* Price Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Market Price */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-blue-800">Market Price</h3>
            {priceLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            )}
          </div>
          <div className="text-2xl font-bold text-blue-900 mb-1">
            {formatPrice(stxPrice)}
          </div>
          <div className="text-xs text-blue-600">
            Updated: {lastUpdated.toLocaleTimeString()}
          </div>
          {priceError && (
            <div className="text-xs text-red-600 mt-1">
              Error: {priceError}
            </div>
          )}
        </div>

        {/* Contract Price */}
        <div className="p-4 bg-gray-800 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-200">Contract Price</h3>
            {contractData.isLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
            )}
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatPrice(contractData.contractPrice)}
          </div>
          <div className="text-xs text-gray-400">
            Block: {contractData.lastUpdate} ({timeSinceUpdate}m ago)
          </div>
          {contractData.error && (
            <div className="text-xs text-red-600 mt-1">
              Error: {contractData.error}
            </div>
          )}
        </div>

        {/* Minimum Deposit */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-sm font-medium text-green-800 mb-2">Minimum Deposit</h3>
          <div className="text-2xl font-bold text-green-900 mb-1">
            {formatSTXAmount(minimumSTX)} STX
          </div>
          <div className="text-xs text-green-600">
            ≈ {formatUSDPrice(2.0)} USD
          </div>
        </div>
      </div>

      {/* Synchronization Status */}
      <div className={`p-4 border rounded-lg ${
        isSynced 
          ? 'bg-green-50 border-green-200' 
          : 'bg-orange-50 border-orange-200'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className={`text-sm font-medium ${
            isSynced ? 'text-green-800' : 'text-orange-800'
          }`}>
            Price Synchronization Status
          </h3>
          <span className={`text-xs px-2 py-1 rounded-full ${
            isSynced 
              ? 'bg-green-100 text-green-800' 
              : 'bg-orange-100 text-orange-800'
          }`}>
            {isSynced ? 'In Sync' : 'Drift Detected'}
          </span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Price Difference:</span>
            <div className={`font-medium ${
              discrepancyPercentage > 5 ? 'text-orange-600' : 'text-green-600'
            }`}>
              {formatPrice(priceDiscrepancy)} ({discrepancyPercentage.toFixed(2)}%)
            </div>
          </div>
          
          <div>
            <span className="text-gray-500">Last Update:</span>
            <div className={`font-medium ${
              isStale ? 'text-orange-400' : 'text-white'
            }`}>
              {timeSinceUpdate}m ago
            </div>
          </div>
          
          <div>
            <span className="text-gray-500">Block Height:</span>
            <div className="font-medium text-white">
              {contractData.currentBlock.toLocaleString()}
            </div>
          </div>
          
          <div>
            <span className="text-gray-500">Update Block:</span>
            <div className="font-medium text-white">
              {contractData.lastUpdate.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Minimum Deposit Comparison */}
      <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
        <h3 className="text-sm font-medium text-gray-200 mb-3">Minimum Deposit Requirements</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-medium text-gray-400 mb-2">Market-Based Calculation</h4>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>STX Price:</span>
                <span className="font-medium">{formatPrice(stxPrice)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Required STX:</span>
                <span className="font-medium">{formatSTXAmount(minimumSTX)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>USD Value:</span>
                <span className="font-medium">{formatUSDPrice(calculateUSDValue(minimumSTX))}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-xs font-medium text-gray-400 mb-2">Contract-Based Calculation</h4>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>STX Price:</span>
                <span className="font-medium">{formatPrice(contractData.contractPrice)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Required STX:</span>
                <span className="font-medium">{formatSTXAmount(contractData.contractMinimum)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>USD Value:</span>
                <span className="font-medium">{formatUSDPrice(contractData.contractMinimum * contractData.contractPrice)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts and Recommendations */}
      {(!isSynced || isStale) && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">Recommendations</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            {!isSynced && (
              <li>• Contract price should be updated - {discrepancyPercentage.toFixed(2)}% difference detected</li>
            )}
            {isStale && (
              <li>• Price data is stale - last update was {timeSinceUpdate} minutes ago</li>
            )}
            <li>• Users may experience validation discrepancies between frontend and contract</li>
            <li>• Consider updating the contract price to maintain accurate minimum deposit enforcement</li>
          </ul>
        </div>
      )}

      {/* Technical Details */}
      <div className="p-4 bg-gray-800 border border-gray-200 rounded-lg">
        <h3 className="text-sm font-medium text-gray-200 mb-2">Technical Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-400">
          <div>
            <h4 className="font-medium mb-1">Market Data</h4>
            <ul className="space-y-1">
              <li>Source: CoinGecko API (primary)</li>
              <li>Update Frequency: Every 15 seconds</li>
              <li>Cache Duration: 2 minutes</li>
              <li>Fallback: $0.50 USD</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-1">Contract Data</h4>
            <ul className="space-y-1">
              <li>Precision: 6 decimal places</li>
              <li>Update Method: Oracle authority only</li>
              <li>Validation: $0.01 - $100.00 range</li>
              <li>Block Time: ~10 minutes average</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}