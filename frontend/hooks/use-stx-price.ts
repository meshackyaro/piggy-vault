/**
 * Custom hook for STX price management
 * Provides real-time STX price and minimum deposit calculations
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  fetchSTXPrice, 
  getMinimumSTXAmount, 
  validateMinimumDeposit,
  MINIMUM_DEPOSIT_USD,
  formatPrice,
  formatSTXAmount,
} from '@/lib/price-oracle';

interface PriceData {
  stxPrice: number;
  minimumSTX: number;
  lastUpdated: Date;
  isLoading: boolean;
  error: string | null;
}

export const useSTXPrice = (autoUpdate: boolean = true) => {
  const [priceData, setPriceData] = useState<PriceData>({
    stxPrice: 0,
    minimumSTX: 0,
    lastUpdated: new Date(),
    isLoading: true,
    error: null,
  });

  // Fetch price data with optional force refresh
  const fetchPriceData = useCallback(async (forceRefresh: boolean = false) => {
    try {
      setPriceData(prev => ({ ...prev, isLoading: true, error: null }));
      
      const [stxPrice, minimumSTX] = await Promise.all([
        fetchSTXPrice(forceRefresh),
        getMinimumSTXAmount(forceRefresh),
      ]);

      setPriceData({
        stxPrice,
        minimumSTX,
        lastUpdated: new Date(),
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to fetch price data:', error);
      setPriceData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch price data',
      }));
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPriceData();
  }, [fetchPriceData]);

  // Auto-update price with multiple strategies
  useEffect(() => {
    if (!autoUpdate) return;

    let isActive = true;

    // Primary update interval - every 15 seconds
    const primaryInterval = setInterval(() => {
      if (isActive) fetchPriceData();
    }, 15000);

    // Cache refresh interval - every 2 minutes (force fresh data)
    const cacheRefreshInterval = setInterval(() => {
      if (isActive) {
        // Force fresh data fetch bypassing cache
        fetchPriceData(true);
      }
    }, 2 * 60 * 1000);

    // Page visibility change handler
    const handleVisibilityChange = () => {
      if (!document.hidden && isActive) {
        // Force fresh data when page becomes visible
        fetchPriceData(true);
      }
    };

    // Window focus handler
    const handleFocus = () => {
      if (isActive) {
        // Force fresh data when window gains focus
        fetchPriceData(true);
      }
    };

    // Add event listeners for better responsiveness
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Cleanup
    return () => {
      isActive = false;
      clearInterval(primaryInterval);
      clearInterval(cacheRefreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [autoUpdate, fetchPriceData]);

  // Validate deposit amount
  const validateDeposit = useCallback(async (amount: number) => {
    return await validateMinimumDeposit(amount);
  }, []);

  // Calculate USD value of STX amount
  const calculateUSDValue = useCallback((stxAmount: number): number => {
    return stxAmount * priceData.stxPrice;
  }, [priceData.stxPrice]);

  // Format functions
  const formatUSDPrice = useCallback((price: number) => formatPrice(price), []);
  const formatSTX = useCallback((amount: number) => formatSTXAmount(amount), []);

  return {
    // Price data
    stxPrice: priceData.stxPrice,
    minimumSTX: priceData.minimumSTX,
    minimumUSD: MINIMUM_DEPOSIT_USD,
    lastUpdated: priceData.lastUpdated,
    isLoading: priceData.isLoading,
    error: priceData.error,
    
    // Functions
    fetchPriceData,
    validateDeposit,
    calculateUSDValue,
    formatUSDPrice,
    formatSTX,
    
    // Computed values
    isDataAvailable: priceData.stxPrice > 0 && priceData.minimumSTX > 0,
  };
};