/**
 * Live Price Ticker Component
 * Shows real-time STX price with automatic updates and visual indicators
 */

'use client';

import { useState, useEffect } from 'react';
import { useSTXPrice } from '@/hooks/use-stx-price';
import PriceHeartbeat from './price-heartbeat';

interface LivePriceTickerProps {
  showMinimum?: boolean;
  compact?: boolean;
  className?: string;
}

export default function LivePriceTicker({ 
  showMinimum = true, 
  compact = false, 
  className = '' 
}: LivePriceTickerProps) {
  const { 
    stxPrice, 
    minimumSTX, 
    minimumUSD, 
    isLoading, 
    error,
    formatUSDPrice,
    formatSTX,
    isDataAvailable,
    lastUpdated,
  } = useSTXPrice();

  const [priceChange, setPriceChange] = useState<'up' | 'down' | 'same' | null>(null);
  const [previousPrice, setPreviousPrice] = useState<number>(0);
  const [updateIndicator, setUpdateIndicator] = useState<boolean>(false);

  // Track price changes for visual feedback
  useEffect(() => {
    if (stxPrice > 0 && previousPrice > 0) {
      if (stxPrice > previousPrice) {
        setPriceChange('up');
      } else if (stxPrice < previousPrice) {
        setPriceChange('down');
      } else {
        setPriceChange('same');
      }
      
      // Show update indicator
      setUpdateIndicator(true);
      const timer = setTimeout(() => {
        setUpdateIndicator(false);
        setPriceChange(null);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
    
    if (stxPrice > 0) {
      setPreviousPrice(stxPrice);
    }
  }, [stxPrice, previousPrice]);

  if (isLoading && !isDataAvailable) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-400">Loading price...</span>
      </div>
    );
  }

  if (error && !isDataAvailable) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <span className="text-red-500 text-sm">⚠️</span>
        <span className="text-sm text-red-400">Price unavailable</span>
      </div>
    );
  }

  if (!isDataAvailable) {
    return null;
  }

  const getPriceChangeColor = () => {
    switch (priceChange) {
      case 'up': return 'text-green-400';
      case 'down': return 'text-red-400';
      case 'same': return 'text-blue-400';
      default: return 'text-white';
    }
  };

  const getPriceChangeIcon = () => {
    switch (priceChange) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      case 'same': return '→';
      default: return '';
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <span className="text-sm font-medium text-white">STX:</span>
        <span className={`text-sm font-semibold transition-colors duration-300 ${getPriceChangeColor()}`}>
          {formatUSDPrice(stxPrice)}
        </span>
        {updateIndicator && (
          <span className="text-xs">
            {getPriceChangeIcon()}
          </span>
        )}
        {updateIndicator && (
          <span className="animate-pulse text-green-500 text-xs">●</span>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-lg p-4 ${className}`}>
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-300">
              Live STX Price
            </h3>
            <PriceHeartbeat size="sm" />
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className={`text-lg font-bold transition-colors duration-300 ${getPriceChangeColor()}`}>
                {formatUSDPrice(stxPrice)}
              </span>
              {priceChange && (
                <span className="text-sm">
                  {getPriceChangeIcon()}
                </span>
              )}
            </div>
            
            {showMinimum && (
              <div className="text-sm text-gray-400">
                <p>Min Deposit: {formatSTX(minimumSTX)} STX ({formatUSDPrice(minimumUSD)})</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-2xl mb-1">📈</div>
          <div className="text-xs text-gray-400">
            <p>Updated: {lastUpdated.toLocaleTimeString()}</p>
            <p className="text-green-400">Auto-refresh: 15s</p>
            <p className="text-blue-400">Cache: 2min</p>
          </div>
        </div>
      </div>
      
      {/* Price change indicator bar */}
      {priceChange && (
        <div className="mt-3">
          <div className={`h-1 rounded-full transition-all duration-500 ${
            priceChange === 'up' ? 'bg-green-500' : 
            priceChange === 'down' ? 'bg-red-500' : 'bg-blue-500'
          }`} style={{ width: updateIndicator ? '100%' : '0%' }}></div>
        </div>
      )}
    </div>
  );
}